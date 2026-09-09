// Appwrite Imports
import { Query } from 'appwrite'
import { databases, tablesDB, appwriteConfig } from '@/libs/appwrite.config'

/**
 * Appwrite caps a page at 500 rows whenever the query expands a relationship: it
 * resolves the relation with an `IN [...ids]` lookup and rejects an IN list of
 * more than 500 values, failing the whole request with
 * "Invalid query: Query on attribute has greater than 500 values".
 *
 * Asking for a bigger page is also how collections silently lose data — a plain
 * `Query.limit(1000)` against 2,442 expenses returns 1,000 rows and no error, so
 * every total computed from it is quietly wrong.
 *
 * Page at the cap and walk the cursor instead of raising the limit.
 */
export const APPWRITE_PAGE_SIZE = 500

// A runaway loop would hammer the API, so stop and warn well past any real collection
const MAX_PAGES = 100

async function paginate<T extends { $id: string }>(
  fetchPage: (queries: string[]) => Promise<T[]>,
  queries: string[],
  label: string
): Promise<T[]> {
  const results: T[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const pageQueries = [...queries, Query.limit(APPWRITE_PAGE_SIZE)]
    if (cursor) pageQueries.push(Query.cursorAfter(cursor))

    const rows = await fetchPage(pageQueries)
    results.push(...rows)

    if (rows.length < APPWRITE_PAGE_SIZE) return results
    cursor = rows[rows.length - 1].$id
  }

  console.warn(`[paginate] stopped at ${MAX_PAGES} pages fetching ${label}; results may be incomplete`)

  return results
}

/**
 * Fetch every document matching `queries`, a page at a time.
 * Pass ordering/filter queries only — the limit and cursor are handled here.
 */
export async function listAllDocuments<T extends { $id: string }>(
  collectionId: string,
  queries: string[] = [],
  label = collectionId
): Promise<T[]> {
  return paginate<T>(
    async pageQueries => {
      const response = await databases.listDocuments(appwriteConfig.database, collectionId, pageQueries)

      return response.documents as unknown as T[]
    },
    queries,
    label
  )
}

/**
 * TablesDB equivalent of `listAllDocuments`, for the newer rows API.
 */
export async function listAllRows<T extends { $id: string }>(
  tableId: string,
  queries: string[] = [],
  label = tableId
): Promise<T[]> {
  return paginate<T>(
    async pageQueries => {
      const response = await tablesDB.listRows(appwriteConfig.database, tableId, pageQueries)

      return response.rows as unknown as T[]
    },
    queries,
    label
  )
}
