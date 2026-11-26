/**
 * Reads the package total off the text of a photographed manifest.
 *
 * The OCR service hands back the page as lines of text, and each run of text
 * with its place on the page. Manifests from different clients are laid out
 * differently, so this looks for the total three ways:
 *
 *  1. a "Package Count" column - the figures under that heading are added up.
 *     Transport manifests list one row per movable unit and print no total; the
 *     "N UNIT(S)" in the header says how many rows there should be;
 *  2. a labelled total - "Total Packages: 14", "No. of Pkgs 14", "TOTAL QTY 14";
 *  3. failing that, the row numbers - a list numbered 1, 2, 3 ... 14 has 14 rows.
 *
 * Anything it finds is only a starting point: the admin checks it against the
 * photo on the review screen, where it can be changed.
 */

export type ManifestReadingSource = 'column' | 'label' | 'rows'

// A run of text with its centre, length and height on the straightened page.
export interface OcrWord {
  text: string
  score: number
  x: number
  y: number
  w: number
  h: number
}

export interface ManifestReading {
  totalPackages: number | null
  source: ManifestReadingSource | null
  // 'high' when a labelled total was found, or the label and the row count agree
  confidence: 'high' | 'low' | null
  // The line the figure was read from, for the review screen
  evidence: string | null
}

export const EMPTY_READING: ManifestReading = { totalPackages: null, source: null, confidence: null, evidence: null }

/**
 * A figure far larger than the rest of its column is almost always a misread: a
 * handwritten tick or note run into the printed count ("3" + "Box" read as 3130,
 * a tick before "31" read as 814). The total is still offered, but not as sure.
 */
// Tested on the stored photos: 6 caught the misreads without losing a correct total.
const STRAY_FACTOR = 6

// No movable unit on the verified manifests held more than about 220 packages, so
// a figure past this is a tick read as an extra digit ("58" and a tick as 581).
const MAX_PER_UNIT = 400

const hasStrayFigure = (values: number[]): boolean => {
  if (values.some(value => value > MAX_PER_UNIT)) return true
  if (values.length < 2) return false

  return values.some((value, index) => {
    const others = values.filter((_, i) => i !== index).sort((a, b) => a - b)
    const median = others[others.length >> 1]

    return value >= 100 && value > STRAY_FACTOR * Math.max(median, 1)
  })
}

const MAX_PACKAGES = 10000

const UNIT = '(?:packages?|packs?|pkgs?|pkg|parcels?|pieces?|pcs|items?|boxes?|bx|cartons?|ctns?|bags?|qty|quantity|units?|cases?)'

// Most specific first. The tier decides between two candidates on one page.
const LABELS: Array<{ tier: number; pattern: RegExp }> = [
  { tier: 3, pattern: new RegExp(`\\b(?:grand\\s*)?(?:total|ttl|tot)\\.?\\s*(?:no\\.?\\s*of\\s*|number\\s*of\\s*)?${UNIT}\\b`, 'i') },
  { tier: 3, pattern: new RegExp(`(?:\\b(?:no\\.?|nos\\.?|number|num)|#)\\s*(?:of\\s*)?${UNIT}\\b`, 'i') },
  // Not "package count": on a transport manifest that is a column heading, not a total.
  { tier: 2, pattern: new RegExp(`\\b${UNIT}\\s*total\\b`, 'i') },
  { tier: 2, pattern: new RegExp(`\\b(?:packages?|pkgs?|parcels?|pieces?|pcs)\\s*[:=]`, 'i') },
  { tier: 1, pattern: /\b(?:grand\s*)?total\b/i }
]

// A "total" next to any of these is money, weight or volume, not a package count.
const NOT_A_COUNT = /(gh[s¢₵]?\b|₵|\bcedis?\b|\$|€|£|\bamount\b|\bprice\b|\bvalue\b|\bcost\b|\bweight\b|\bwt\b|\bkgs?\b|\bcbm\b|\bvat\b|\blevy\b|\btax\b|\bvolume\b|\bm3\b)/i

// OCR mistakes inside numbers: O for 0, l or I for 1, S for 5, B for 8.
const fixDigits = (token: string): string =>
  token.replace(/[oO]/g, '0').replace(/[lI|]/g, '1').replace(/[sS]/g, '5').replace(/B/g, '8')

// A whole number token, allowing the usual OCR slips as long as it has at least one real digit.
const NUMBER_TOKEN = /(?<![\w.,/])([0-9oOlIsSB|]*[0-9][0-9oOlIsSB|]*)(?![\w/]|[.,]\d)/g

const firstCount = (text: string): number | null => {
  for (const match of text.matchAll(NUMBER_TOKEN)) {
    const value = parseInt(fixDigits(match[1]), 10)

    if (Number.isFinite(value) && value >= 1 && value <= MAX_PACKAGES) return value
  }

  return null
}

const isLoneNumber = (line: string): boolean => /^\s*[:=\-]?\s*[0-9oOlIsSB|]*[0-9][0-9oOlIsSB|]*\s*$/.test(line)

interface Candidate {
  value: number
  tier: number
  index: number
  evidence: string
}

const fromLabels = (lines: string[]): Candidate | null => {
  let best: Candidate | null = null

  lines.forEach((line, index) => {
    if (NOT_A_COUNT.test(line)) return

    for (const { tier, pattern } of LABELS) {
      const match = pattern.exec(line)

      if (!match) continue

      // The figure follows the label on the same line, or sits alone on the next one.
      let value = firstCount(line.slice(match.index + match[0].length))
      let evidence = line

      if (value === null && index + 1 < lines.length && isLoneNumber(lines[index + 1])) {
        value = firstCount(lines[index + 1])
        evidence = `${line} ${lines[index + 1].trim()}`
      }

      if (value === null) continue

      // Higher tier wins; within a tier the later line, since totals sit at the foot of the page.
      if (!best || tier > best.tier || (tier === best.tier && index > best.index)) {
        best = { value, tier, index, evidence: evidence.trim() }
      }

      break
    }
  })

  return best
}

/**
 * The highest row number reached counting up from 1. A few numbers can be
 * missing (OCR drops the odd one), but not a run of them.
 */
const fromRowNumbers = (lines: string[]): number | null => {
  const seen = new Set<number>()

  lines.forEach(line => {
    const match = /^\s*([0-9oOlIsSB|]{1,4})(?:[\s.):\-]|$)/.exec(line)

    if (!match) return

    const value = parseInt(fixDigits(match[1]), 10)

    if (Number.isFinite(value) && value >= 1 && value <= MAX_PACKAGES) seen.add(value)
  })

  if (!seen.has(1) && !seen.has(2)) return null

  let last = 0
  let gap = 0

  for (let n = 1; n <= MAX_PACKAGES; n++) {
    if (seen.has(n)) {
      last = n
      gap = 0
    } else if (++gap > 2) {
      break
    }
  }

  // A handful of numbered lines is more likely a list of terms than a package list.
  if (last < 3) return null

  // Too many holes and it is guesswork.
  let found = 0

  for (let n = 1; n <= last; n++) if (seen.has(n)) found++

  return found / last >= 0.75 ? last : null
}

const COLUMN_HEADING = /package\s*s?\s*c[o0]un[t7]|pkgs?\.?\s*c[o0]un[t7]|no\.?\s*of\s*pkgs?/i

// Where the table ends: the remarks and sign-off boxes below it.
const TABLE_END = /internal|remarks|observations|dispatch|receiving|handover|acknowledg|signature/i

// The last figure in a run of text. Checkers tick the column by hand, and the tick
// often comes back stuck to the figure: "25/", "4V", "9|".
const TRAILING_COUNT = /(?:^|\s)([0-9oOlIsSB]*[0-9][0-9oOlIsSB]*)\s*(?:[/\\|.,;:'"`)\]~^✓✔-]+|[vVJ])?\s*$/

// "3 UNIT(S)" in the header of a transport manifest: how many rows the table has.
const declaredUnits = (lines: string[]): number | null => {
  for (const line of lines) {
    const match = /(?:^|\s)(\d{1,3})\s*UNIT\s*\(\s*S\s*\)/i.exec(line) || /(?:^|\s)(\d{1,3})\s*UNITS\b/i.exec(line)

    if (match) return parseInt(match[1], 10)
  }

  return null
}

// The left and right edge of a stretch of characters inside a run of text,
// assuming the characters are evenly wide.
const span = (word: OcrWord, start: number, length: number) => {
  const left = word.x - word.w / 2
  const perChar = word.w / Math.max(1, word.text.length)

  return { from: left + start * perChar, to: left + (start + length) * perChar }
}

const fromPackageColumn = (words: OcrWord[], lines: string[]): ManifestReading | null => {
  let best: ManifestReading | null = null

  // A photo can catch two sheets; each heading is tried and the best reading kept.
  for (const heading of words) {
    const match = COLUMN_HEADING.exec(heading.text)

    if (!match) continue

    const column = span(heading, match.index, match[0].length)
    const width = Math.max(column.to - column.from, 3 * heading.h)
    const left = column.from - 0.5 * width
    const right = column.to + 0.5 * width

    const below = words.filter(word => word.y > heading.y + 0.5 * heading.h)
    const end = below.filter(word => TABLE_END.test(word.text)).reduce((min, word) => Math.min(min, word.y), Infinity)

    // Figures sitting under the heading, top to bottom.
    const figures: Array<{ value: number; y: number; h: number; score: number }> = []

    below
      .filter(word => word.y < end)
      .sort((a, b) => a.y - b.y)
      .forEach(word => {
        const trailing = TRAILING_COUNT.exec(word.text)

        if (!trailing) return

        const token = trailing[1]
        const place = span(word, trailing.index + trailing[0].indexOf(token), token.length)
        const centre = (place.from + place.to) / 2

        if (centre < left || centre > right) return

        const value = parseInt(fixDigits(token), 10)

        if (!Number.isFinite(value) || value < 1 || value > MAX_PACKAGES) return

        // One figure per row: OCR sometimes boxes the same figure twice.
        const previous = figures[figures.length - 1]

        if (previous && Math.abs(word.y - previous.y) < 0.5 * Math.max(word.h, previous.h)) {
          if (word.score > previous.score) figures[figures.length - 1] = { value, y: word.y, h: word.h, score: word.score }

          return
        }

        figures.push({ value, y: word.y, h: word.h, score: word.score })
      })

    if (figures.length === 0) continue

    const total = figures.reduce((sum, figure) => sum + figure.value, 0)
    // How many rows there should be: the header's "N UNIT(S)", or else the numbered rows.
    const units = declaredUnits(lines) ?? fromRowNumbers(lines)

    const reading: ManifestReading = {
      totalPackages: total,
      source: 'column',
      // Every row the header promises was found, and nothing more.
      confidence: units === figures.length && !hasStrayFigure(figures.map(f => f.value)) ? 'high' : 'low',
      evidence: `Package count column: ${figures.map(f => f.value).join(' + ')}` + (units ? ` (${units} unit${units === 1 ? '' : 's'})` : '')
    }

    if (!best || (reading.confidence === 'high' && best.confidence !== 'high')) best = reading
  }

  return best
}

// A row of a Jumia sheet starts with the movable unit's id: mu_GH-All-Network Gen 7_1787...
// Faint print comes back mangled ("ma_GH", "Nerwork Gem"), so any one part will do.
const UNIT_ROW = /[a-z]{0,2}_\s*G[HN]\b|G[HN]-?\s*A[l1I|]{2}\s*-?\s*N|ne[tr]?w[o0]r[kc]\s*ge[nm]|gen\s*7_?\d{6,}/i

const WHOLE_COUNT = /^\s*([0-9oOlIsSB]*[0-9][0-9oOlIsSB]*)\s*(?:[/\\|.,;:'"`)\]~^✓✔-]+|[vVJ])?\s*$/

/**
 * The number of units the sheet says it carries: "3 UNIT(S)" on a transport
 * manifest, or the large figure over "NUMBER OF MOVABLE UNITS" on a handover sheet.
 */
const UNITS_LABEL = /number\s*of\s*movable|movable\s*units/i

const declaredUnitCount = (words: OcrWord[], lines: string[]): number | null => {
  const fromLine = declaredUnits(lines)

  if (fromLine !== null) return fromLine

  for (const label of words) {
    if (!UNITS_LABEL.test(label.text)) continue

    const figure = words
      .filter(word => WHOLE_COUNT.test(word.text) && word !== label)
      .filter(word => Math.abs(word.x - label.x) < label.w && word.y < label.y + label.h && word.y > label.y - 5 * label.h)
      .sort((a, b) => Math.abs(a.y - label.y) - Math.abs(b.y - label.y))[0]

    if (figure) return parseInt(fixDigits(WHOLE_COUNT.exec(figure.text)![1]), 10)
  }

  return null
}

// The row numbers printed at the left of the unit rows ("2 mu_GH-All-Network ..."):
// the highest one reached, read from the lines the unit ids are on.
const highestUnitRowNumber = (lines: string[]): number | null => {
  let highest: number | null = null

  lines.forEach(line => {
    if (!UNIT_ROW.test(line)) return

    const match = /^\s*(\d{1,3})(?=\s)/.exec(line)

    if (match) highest = Math.max(highest ?? 0, parseInt(match[1], 10))
  })

  return highest
}

/**
 * The same, read by position: the number printed level with each unit row, to the
 * left of its id. On a tilted photo the rows can run together into one line of
 * text, but each row number is still a word of its own beside its row. Counts only
 * when the rows are numbered 1, 2, 3 ... with none missing.
 */
const numberedUnitRows = (words: OcrWord[], rows: OcrWord[]): number | null => {
  const numbers = rows.map(row => {
    const label = words.find(
      word =>
        /^\s*\d{1,3}\s*$/.test(word.text) &&
        word.x + word.w / 2 < row.x - row.w / 2 &&
        Math.abs(word.y - row.y) < 0.7 * Math.max(word.h, row.h)
    )

    return label ? parseInt(label.text, 10) : null
  })

  return numbers.every((number, index) => number === index + 1) ? numbers.length : null
}

type UnitRowAnalysis = {
  rows: OcrWord[]

  /** The figure found on each row, or null where none was */
  perRow: Array<number | null>

  /** Where the column of figures sits, and the size of a cell in it */
  columnX: number
  cellWidth: number
  cellHeight: number
}

/**
 * Jumia's transport manifests and handover sheets list one row per movable unit,
 * with that unit's package count at the right of the row and no printed total.
 * Take each unit row, find the column of figures the rows share, and the figure
 * each row has in it.
 */
const analyseUnitRows = (words: OcrWord[]): UnitRowAnalysis | null => {
  const rows = words.filter(word => UNIT_ROW.test(word.text)).sort((a, b) => a.y - b.y)

  if (rows.length === 0) return null

  // Figures to the right of a row's id and level with it. Each figure belongs to
  // one row only - the nearest - or a tall figure between two rows is counted twice.
  const sameRow = (word: OcrWord, row: OcrWord) =>
    word.x - word.w / 2 > row.x + row.w / 2 - row.h && Math.abs(word.y - row.y) < 0.6 * Math.max(word.h, row.h)

  const candidates: Array<Array<{ word: OcrWord; value: number }>> = rows.map(() => [])

  // A figure can come back on its own ("46"), ticked ("46/"), or stuck to the
  // handwriting beside it ("Box67", "32 Bin"); each is placed by where it sits.
  const figuresIn = (word: OcrWord): Array<{ word: OcrWord; value: number }> => {
    if (WHOLE_COUNT.test(word.text)) return [{ word, value: parseInt(fixDigits(WHOLE_COUNT.exec(word.text)![1]), 10) }]

    return [...word.text.matchAll(/(?<![\d_])\d{1,4}(?![\d_])/g)].map(match => {
      const place = span(word, match.index!, match[0].length)

      return {
        word: { ...word, x: (place.from + place.to) / 2, w: place.to - place.from },
        value: parseInt(match[0], 10)
      }
    })
  }

  words
    .filter(word => !rows.includes(word))
    .flatMap(figuresIn)
    .forEach(({ word, value }) => {
      if (!(value >= 1 && value <= MAX_PACKAGES)) return

      let nearest = -1

      rows.forEach((row, index) => {
        if (sameRow(word, row) && (nearest === -1 || Math.abs(word.y - row.y) < Math.abs(word.y - rows[nearest].y))) {
          nearest = index
        }
      })

      if (nearest !== -1) candidates[nearest].push({ word, value })
    })

  // The column is the position most rows have a figure at.
  const all = candidates.flat()

  if (all.length === 0) return null

  const tolerance = (word: OcrWord) => Math.max(2 * word.h, 30)

  let columnX = all[0].word.x
  let columnRows = 0

  for (const { word } of all) {
    const hits = candidates.filter(list => list.some(c => Math.abs(c.word.x - word.x) < tolerance(word))).length

    if (hits > columnRows || (hits === columnRows && word.x > columnX)) {
      columnX = word.x
      columnRows = hits
    }
  }

  const chosen = candidates.map(
    list =>
      list
        .filter(c => Math.abs(c.word.x - columnX) < tolerance(c.word))
        .sort((a, b) => Math.abs(a.word.x - columnX) - Math.abs(b.word.x - columnX))[0] || null
  )

  // A cell is as tall as a row and wide enough for a three-digit figure and some slack
  const found = chosen.filter(Boolean).map(c => c!.word)
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1]
  const rowHeight = median(rows.map(row => row.h))
  const figureHeight = found.length ? median(found.map(word => word.h)) : rowHeight

  return {
    rows,
    perRow: chosen.map(c => (c ? c.value : null)),
    // Centred on the figures found, not on whichever one picked the column
    columnX: found.length ? median(found.map(word => word.x)) : columnX,
    cellWidth: Math.max(3 * figureHeight, 60),
    cellHeight: Math.max(1.5 * rowHeight, 1.2 * figureHeight)
  }
}

const fromUnitRows = (words: OcrWord[], lines: string[]): ManifestReading | null => {
  const analysis = analyseUnitRows(words)

  if (!analysis) return null

  const { rows, perRow } = analysis
  const figures = perRow.filter((value): value is number => value !== null)

  if (figures.length === 0) return null

  const declared = declaredUnitCount(words, lines)
  const expected = declared ?? fromRowNumbers(lines)

  // Every unit the sheet declares has a row, and every row has its figure. When the
  // declared count is too faint to read, the printed row numbers stand in for it.
  const rowsCheckOut =
    expected === rows.length ||
    (declared === null &&
      (highestUnitRowNumber(lines) === rows.length || numberedUnitRows(words, rows) === rows.length))

  return {
    totalPackages: figures.reduce((sum, value) => sum + value, 0),
    source: 'column',
    confidence: rowsCheckOut && figures.length === rows.length && !hasStrayFigure(figures) ? 'high' : 'low',
    evidence:
      `Package figures: ${figures.join(' + ')}` +
      (expected ? ` (${figures.length} of ${expected} unit${expected === 1 ? '' : 's'})` : '')
  }
}

/** A small area of the page to read again, in the coordinates of the OCR words */
export type OcrCell = { x: number; y: number; w: number; h: number }

/**
 * Where a figure should be but none was read: the package column, on each unit
 * row that came back without one. A tick or handwritten note across a printed
 * figure makes the OCR box them together and lose the figure; reading just that
 * cell again usually recovers it (see the OCR service's /cells).
 */
export const cellsToReread = (words: OcrWord[], lines: string[]): OcrCell[] => {
  const analysis = analyseUnitRows(words)

  if (!analysis) return []

  const cells = analysis.rows
    .map((row, index) => ({ row, value: analysis.perRow[index] }))
    .filter(({ value }) => value === null)
    .map(({ row }) => ({ x: analysis.columnX, y: row.y, w: analysis.cellWidth, h: analysis.cellHeight }))

  // The large, pale unit count printed above "NUMBER OF MOVABLE UNITS", when it was
  // not read: it is what says whether every row was found
  if (declaredUnitCount(words, lines) === null) {
    const label = words.find(word => UNITS_LABEL.test(word.text))

    if (label) cells.push({ x: label.x, y: label.y - 2 * label.h, w: 0.6 * label.w, h: 2.8 * label.h })
  }

  return cells
}

/**
 * The figures read from those cells, as words the reader can place. Only a lone,
 * confident number is kept: a half-read cell ("29y" for 20) is worse than none.
 */
export const wordsFromCells = (cells: OcrCell[], readings: Array<{ text: string; score: number }>): OcrWord[] =>
  cells.flatMap((cell, index) => {
    const reading = readings[index]
    // A stray mark either side is a bit of tick the ink removal left ("-36", "45.")
    const match = reading ? /^[\s\-.,·:;'`~_]*(\d{1,4})[\s\-.,·:;'`~_]*$/.exec(reading.text) : null

    if (!match || reading.score < 0.8) return []

    return [{ text: match[1], score: reading.score, x: cell.x, y: cell.y, w: Math.min(cell.w, cell.h * match[1].length), h: cell.h / 1.5 }]
  })

export const readManifestText = (rawLines: string[], words: OcrWord[] = []): ManifestReading => {
  const lines = rawLines.map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean)

  if (lines.length === 0) return EMPTY_READING

  const unitRows = words.length ? fromUnitRows(words, lines) : null
  const column = words.length ? fromPackageColumn(words, lines) : null

  // Prefer whichever checks out against the declared unit count.
  const tabled = [unitRows, column].filter(Boolean) as ManifestReading[]
  const best = tabled.find(reading => reading.confidence === 'high') || tabled[0]

  if (best) return best

  const label = fromLabels(lines)
  const rows = fromRowNumbers(lines)

  if (label) {
    return {
      totalPackages: label.value,
      source: 'label',
      confidence: label.tier >= 2 || label.value === rows ? 'high' : 'low',
      evidence: label.evidence
    }
  }

  if (rows) {
    return { totalPackages: rows, source: 'rows', confidence: 'low', evidence: `Rows numbered 1 to ${rows}` }
  }

  return EMPTY_READING
}
