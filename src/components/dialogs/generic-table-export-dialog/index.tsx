'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import logo from '@assets/mineral.png'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import { styled } from '@mui/material/styles'
import type { TypographyProps } from '@mui/material/Typography'

import type { CustomInputHorizontalData } from '@core/components/custom-inputs/types'
import CustomInputHorizontal from '@core/components/custom-inputs/Horizontal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ExportColumn {
  header: string
  accessor: (row: any) => string | number
  align?: 'left' | 'center' | 'right'
  width?: number   // PDF column width
  excelWidth?: number  // Excel column width
}

export interface ExportSummary {
  label: string
  value: string
}

interface GenericTableExportDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  data: any[]
  columns: ExportColumn[]
  summaryItems?: ExportSummary[]
  fileName?: string
}

const Title = styled(Typography, {
  name: 'MuiCustomInputVertical',
  slot: 'title'
})<TypographyProps>(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  color: 'var(--mui-palette-text-primary) !important'
}))

const customInputData: CustomInputHorizontalData[] = [
  {
    title: (
      <Title component='div' className='flex items-center gap-1'>
        <i className='ri-file-pdf-2-line text-xl' style={{ color: 'var(--mui-palette-warning-main)' }} />
        <Typography color='text.primary' className='font-medium'>PDF</Typography>
      </Title>
    ),
    content: 'Export as PDF with print preview',
    value: 'pdf',
    isSelected: true
  },
  {
    title: (
      <Title component='div' className='flex items-center gap-1'>
        <i className='ri-file-excel-2-line text-xl' style={{ color: 'var(--mui-palette-success-main)' }} />
        <Typography color='text.primary' className='font-medium'>Excel</Typography>
      </Title>
    ),
    content: 'Export as Excel spreadsheet',
    value: 'excel'
  }
]

const GenericTableExportDialog = ({ open, setOpen, title, data, columns, summaryItems, fileName }: GenericTableExportDialogProps) => {
  const initialSelected = 'pdf'
  const [selected, setSelected] = useState<string>(initialSelected)

  const handleChange = (prop: string | ChangeEvent<HTMLInputElement>) => {
    if (typeof prop === 'string') {
      setSelected(prop)
    } else {
      setSelected((prop.target as HTMLInputElement).value)
    }
  }

  const baseName = fileName || title.toLowerCase().replace(/\s+/g, '-')
  const timestamp = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`

  const handleExport = () => {
    if (selected === 'pdf') {
      exportToPDF()
    } else {
      exportToExcel()
    }
    setOpen(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    const img = new Image()
    img.src = logo.src

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      const logoBase64 = canvas.toDataURL('image/png')

      const logoWidth = 50
      const logoHeight = 30
      doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const companyName = 'Ezar Delivery Services'
      doc.text(companyName, (pageWidth - doc.getStringUnitWidth(companyName) * 16 / doc.internal.scaleFactor) / 2, logoHeight + 20)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const address = ['Kumasi, Ashanti Region, Ghana', 'Phone: +233 50345356/ +233 50345356', 'Email: ezardeliveryservices@gmail.com']

      let yPos = logoHeight + 30
      address.forEach(line => {
        doc.text(line, (pageWidth - doc.getStringUnitWidth(line) * 10 / doc.internal.scaleFactor) / 2, yPos)
        yPos += 6
      })

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 20, yPos + 10)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${timestamp}`, pageWidth - 20 - doc.getStringUnitWidth(`Generated: ${timestamp}`) * 11 / doc.internal.scaleFactor, yPos + 10)

      doc.setLineWidth(0.5)
      doc.line(20, yPos + 15, pageWidth - 20, yPos + 15)
      yPos += 25

      if (summaryItems && summaryItems.length > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Summary', 20, yPos)
        yPos += 8
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        summaryItems.forEach(item => {
          doc.text(`${item.label}: ${item.value}`, 20, yPos)
          yPos += 6
        })
        yPos += 4
        doc.setLineWidth(0.3)
        doc.line(20, yPos, pageWidth - 20, yPos)
      }

      const tableHead = columns.map(col => col.header)
      const tableBody = data.map(row => columns.map(col => String(col.accessor(row))))

      autoTable(doc, {
        head: [tableHead],
        body: tableBody,
        startY: yPos + 5,
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51] },
        styles: { halign: 'center', valign: 'middle', fontSize: 9 },
        columnStyles: Object.fromEntries(columns.map((col, i) => [i, {
          halign: col.align || 'left',
          ...(col.width ? { cellWidth: col.width } : {})
        }]))
      })

      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      const printFrame = document.createElement('iframe')
      printFrame.style.display = 'none'
      document.body.appendChild(printFrame)
      printFrame.src = pdfUrl

      printFrame.onload = () => {
        try {
          const handlePrintComplete = () => {
            URL.revokeObjectURL(pdfUrl)
            document.body.removeChild(printFrame)
            window.removeEventListener('afterprint', handlePrintComplete)
            const link = document.createElement('a')
            link.href = URL.createObjectURL(pdfBlob)
            link.download = `${baseName} ${timestamp}.pdf`
            link.click()
          }
          window.addEventListener('afterprint', handlePrintComplete)
          printFrame.contentWindow?.print()
        } catch {
          const link = document.createElement('a')
          link.href = pdfUrl
          link.download = `${baseName} ${timestamp}.pdf`
          link.click()
          URL.revokeObjectURL(pdfUrl)
          document.body.removeChild(printFrame)
        }
      }
    }
  }

  const exportToExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([])

    const headerRows = [
      ['', '', 'Ezar Delivery Services'],
      ['', '', 'Kumasi, Ashanti Region, Ghana'],
      ['', '', 'Phone: +233 50345356/ +233 50345356'],
      ['', '', 'Email: ezardeliveryservices@gmail.com'],
      [],
      ['', '', title, '', `Generated: ${timestamp}`],
      []
    ]

    if (summaryItems && summaryItems.length > 0) {
      headerRows.push(['Summary'])
      headerRows.push(summaryItems.map(item => `${item.label}: ${item.value}`))
      headerRows.push([])
    }

    headerRows.push(columns.map(col => col.header))

    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' })

    const excelData = data.map(row => columns.map(col => col.accessor(row)))
    XLSX.utils.sheet_add_aoa(ws, excelData, { origin: `A${headerRows.length + 1}` })

    ws['!cols'] = columns.map(col => ({ wch: col.excelWidth || 18 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31))
    XLSX.writeFile(wb, `${baseName} ${timestamp}.xlsx`)
  }

  return (
    <Dialog open={open} maxWidth='md' scroll='body' onClose={() => { setOpen(false); setSelected(initialSelected) }}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Export {title}
        <Typography component='span' className='flex flex-col text-center'>
          Export {data.length} records as PDF or Excel
        </Typography>
      </DialogTitle>
      <form onSubmit={e => e.preventDefault()}>
        <DialogContent className='pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={() => setOpen(false)} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          <Grid container spacing={5}>
            {customInputData.map((item, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <CustomInputHorizontal key={index} type='radio' name='exportType' selected={selected} data={item} handleChange={handleChange} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' onClick={handleExport} type='button'>Export</Button>
          <Button variant='outlined' color='secondary' onClick={() => { setOpen(false); setSelected(initialSelected) }} type='reset'>Cancel</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default GenericTableExportDialog
