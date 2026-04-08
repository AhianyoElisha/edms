'use client'

// React Imports
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import logo from '@assets/mineral.png'

// MUI Imports
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

// Type Imports
import type { CustomInputHorizontalData } from '@core/components/custom-inputs/types'

// Component Imports
import CustomInputHorizontal from '@core/components/custom-inputs/Horizontal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

// Type Imports
import type { ExpenseType, ExpenseTypeCategory, PaymentStatusType } from '@/types/apps/deliveryTypes'

type ExpenseExportDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  tableData: ExpenseType[]
  totals: { total: number; paid: number; pending: number }
  getExpenseTypeLabel: (type: ExpenseTypeCategory) => string
  formatCurrency: (amount: number) => string
}

// Styled Components
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
        <Typography color='text.primary' className='font-medium'>
          PDF
        </Typography>
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
        <Typography color='text.primary' className='font-medium'>
          Excel
        </Typography>
      </Title>
    ),
    content: 'Export as Excel spreadsheet',
    value: 'excel'
  }
]

const PAYMENT_STATUS_LABELS: Record<PaymentStatusType, string> = {
  paid: 'Paid',
  pending: 'Pending',
  partial: 'Partial'
}

const ExpenseExportDialog = ({ open, setOpen, tableData, totals, getExpenseTypeLabel, formatCurrency }: ExpenseExportDialogProps) => {
  const initialSelected: string = customInputData?.find(item => item.isSelected)?.value || ''
  const [selected, setSelected] = useState<string>(initialSelected)

  const handleChange = (prop: string | ChangeEvent<HTMLInputElement>) => {
    if (typeof prop === 'string') {
      setSelected(prop)
    } else {
      setSelected((prop.target as HTMLInputElement).value)
    }
  }

  const handleExport = () => {
    if (selected === 'pdf') {
      exportToPDF(tableData)
    } else if (selected === 'excel') {
      exportToExcel(tableData)
    }
    setOpen(false)
  }

  const exportToPDF = (data: ExpenseType[]) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    const img = new Image()
    img.src = logo.src

    img.onload = () => {
      // Convert logo to base64
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      const logoBase64 = canvas.toDataURL('image/png')

      // Add logo
      const logoWidth = 50
      const logoHeight = 30
      const logoX = (pageWidth - logoWidth) / 2
      doc.addImage(logoBase64, 'PNG', logoX, 10, logoWidth, logoHeight)

      // Add company name
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const companyName = 'Ezar Delivery Services'
      const companyNameWidth = doc.getStringUnitWidth(companyName) * doc.getFontSize() / doc.internal.scaleFactor
      const companyNameX = (pageWidth - companyNameWidth) / 2
      doc.text(companyName, companyNameX, logoHeight + 20)

      // Add company address
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const address = [
        'Kumasi, Ashanti Region, Ghana',
        'Phone: +233 50345356/ +233 50345356',
        'Email: ezardeliveryservices@gmail.com'
      ]

      let yPosition = logoHeight + 30
      address.forEach(line => {
        const lineWidth = doc.getStringUnitWidth(line) * doc.getFontSize() / doc.internal.scaleFactor
        const lineX = (pageWidth - lineWidth) / 2
        doc.text(line, lineX, yPosition)
        yPosition += 6
      })

      // Add report title and date
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      const title = 'Expense Report'
      const dateStr = `Generated: ${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}`
      const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor
      const dateWidth = doc.getStringUnitWidth(dateStr) * doc.getFontSize() / doc.internal.scaleFactor
      const titleX = (pageWidth - titleWidth - dateWidth - 10) / 2
      doc.text(title, titleX, yPosition + 10)
      doc.setFontSize(11)
      doc.text(dateStr, titleX + titleWidth + 10, yPosition + 10)

      // Add horizontal line
      doc.setLineWidth(0.5)
      doc.line(20, yPosition + 15, pageWidth - 20, yPosition + 15)

      // Add summary section
      yPosition += 25
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Expenses (${data.length} records): ${formatCurrency(totals.total)}`, 20, yPosition)
      yPosition += 6
      doc.text(`Paid: ${formatCurrency(totals.paid)}`, 20, yPosition)
      yPosition += 6
      doc.text(`Pending: ${formatCurrency(totals.pending)}`, 20, yPosition)
      yPosition += 10

      // Add horizontal line after summary
      doc.setLineWidth(0.3)
      doc.line(20, yPosition, pageWidth - 20, yPosition)

      // Create table data
      const tableColumn = ['Date', 'Type', 'Description', 'Vendor', 'Amount (GH₵)', 'Status']
      const tableRows = data.map(item => [
        dayjs(item.expenseDate).format('DD MMM YYYY'),
        getExpenseTypeLabel(item.expenseType),
        item.description || '-',
        item.vendor || '-',
        formatCurrency(item.amount),
        PAYMENT_STATUS_LABELS[item.paymentStatus] || item.paymentStatus
      ])

      // Add table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: yPosition + 5,
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51] },
        styles: {
          halign: 'center',
          valign: 'middle',
          fontSize: 9
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 30 },
          2: { halign: 'left', cellWidth: 50 },
          3: { halign: 'left', cellWidth: 30 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 20 }
        }
      })

      // Print preview via iframe
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

            const fileName = `expense report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.pdf`
            const downloadLink = document.createElement('a')
            downloadLink.href = URL.createObjectURL(pdfBlob)
            downloadLink.download = fileName
            downloadLink.click()
          }

          window.addEventListener('afterprint', handlePrintComplete)
          printFrame.contentWindow?.print()
        } catch (error) {
          console.error('Printing failed:', error)
          const fileName = `expense report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.pdf`
          const downloadLink = document.createElement('a')
          downloadLink.href = pdfUrl
          downloadLink.download = fileName
          downloadLink.click()
          URL.revokeObjectURL(pdfUrl)
          document.body.removeChild(printFrame)
        }
      }
    }
  }

  const exportToExcel = (data: ExpenseType[]) => {
    const ws = XLSX.utils.aoa_to_sheet([])

    // Add company details
    const companyDetails = [
      ['', '', 'Ezar Delivery Services'],
      ['', '', 'Kumasi, Ashanti Region, Ghana'],
      ['', '', 'Phone: +233 50345356/ +233 50345356'],
      ['', '', 'Email: ezardeliveryservices@gmail.com'],
      [],
      ['', '', 'Expense Report', '', `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
      [],
      ['Summary'],
      [`Total Expenses (${data.length} records)`, formatCurrency(totals.total), '', `Paid: ${formatCurrency(totals.paid)}`, '', `Pending: ${formatCurrency(totals.pending)}`],
      [],
      ['Date', 'Type', 'Sub-Category', 'Description', 'Vendor', 'Amount (GH₵)', 'Status']
    ]

    XLSX.utils.sheet_add_aoa(ws, companyDetails, { origin: 'A1' })

    // Prepare data
    const excelData = data.map(item => [
      dayjs(item.expenseDate).format('DD MMM YYYY'),
      getExpenseTypeLabel(item.expenseType),
      item.subCategory || '-',
      item.description || '-',
      item.vendor || '-',
      item.amount,
      PAYMENT_STATUS_LABELS[item.paymentStatus] || item.paymentStatus
    ])

    XLSX.utils.sheet_add_aoa(ws, excelData, { origin: `A${companyDetails.length + 1}` })

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },  // Date
      { wch: 20 },  // Type
      { wch: 20 },  // Sub-Category
      { wch: 40 },  // Description
      { wch: 20 },  // Vendor
      { wch: 15 },  // Amount
      { wch: 12 }   // Status
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Report')

    XLSX.writeFile(wb, `expense report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.xlsx`)
  }

  return (
    <Dialog
      open={open}
      maxWidth='md'
      scroll='body'
      onClose={() => {
        setOpen(false)
        setSelected(initialSelected)
      }}
    >
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        Export Expense Report
        <Typography component='span' className='flex flex-col text-center'>
          Export {tableData.length} expense records as PDF or Excel
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
                <CustomInputHorizontal
                  key={index}
                  type='radio'
                  name='exportType'
                  selected={selected}
                  data={item}
                  handleChange={handleChange}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='contained' onClick={handleExport} type='button'>
            Export
          </Button>
          <Button
            variant='outlined'
            color='secondary'
            onClick={() => {
              setOpen(false)
              setSelected(initialSelected)
            }}
            type='reset'
          >
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ExpenseExportDialog
