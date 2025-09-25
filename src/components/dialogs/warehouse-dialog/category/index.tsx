'use client'

// React Imports
import { useEffect, useState } from 'react'
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

type ExportData = {

}

type ExportDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  data?: ExportData
}


const initialExportData: ExportDialogProps['data'] = {
  firstName: '',
  lastName: '',
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
    content: 'PDF export',
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
    content: 'Excel export',
    value: 'excel'
  }
]

const WarehouseCategoryExportDialog = ({ open, setOpen, data, tableData }: ExportDialogProps & { tableData: any[] }) => {
 
  const handleExport = () => {
    if (selected === 'pdf') {
      exportToPDF(tableData)
    } else if (selected === 'excel') {
      exportToExcel(tableData)
    }
    setOpen(false)
  }

const exportToPDF = (data: any[]) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  
  // Create a new Image object
  const img = new Image()
  img.src = logo.src

  // Wait for the image to load before creating the PDF
  img.onload = () => {
    // Convert the PNG to base64
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(img, 0, 0)
    const logoBase64 = canvas.toDataURL('image/png')

    // Add logo to PDF
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
    
    // Add report title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const title = 'Warehouse Categories Report'
    const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor
    const titleX = (pageWidth - titleWidth) / 2
    doc.text(title, titleX, yPosition + 10)
    
    // Add horizontal line
    doc.setLineWidth(0.5)
    doc.line(20, yPosition + 15, pageWidth - 20, yPosition + 15)
    
    // Create table data
    const tableColumn = ['Category', 'Created Date', 'Total Quantity']
    const tableRows = data.map(item => [
      item.title,
      new Date(item.$createdAt).toLocaleDateString(),
      item.totalProducts,
    ])

    // Add table to document
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPosition + 25,
      theme: 'grid',
      headStyles: { fillColor: [51, 51, 51] },
      styles: { 
        halign: 'center',
        valign: 'middle',
        fontSize: 10
      }
    })

    // Create blob and embed it in an iframe for print preview
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    document.title = window.parent.document.title = `inventory report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.pdf`;
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
          
          const fileName = `warehouse category report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.pdf`
          const downloadLink = document.createElement('a')
          downloadLink.href = pdfUrl
          downloadLink.download = fileName
          downloadLink.click()
          URL.revokeObjectURL(pdfUrl)
        }

        window.addEventListener('afterprint', handlePrintComplete)
        printFrame.contentWindow?.print()
      } catch (error) {
        console.error('Printing failed:', error)
        const fileName = `warehouse category report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}.pdf`
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


  const exportToExcel = (data: any[]) => {
  // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([])

  const companyDetails = [
    ['', '', 'Ezar Delivery Services'],
    ['', '', 'Kumasi, Ashanti Region, Ghana'],
    ['', '', 'Phone: +233 50345356/ +233 50345356'],
    ['', '', 'Email: ezardeliveryservices@gmail.com'],
    [], // Empty row for spacing
    ['', '', 'Warehouse Categories Report', '', `Time Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
    [], // Empty row for spacing
    ['Category', 'Created Date', 'Total Quantity']
  ]

  XLSX.utils.sheet_add_aoa(ws, companyDetails, { origin: 'A1' })

  // Prepare data for excel
  const excelData = data.map(item => [
    item.title,
    new Date(item.$createdAt).toLocaleDateString(),
    item.totalProducts,
  ])

  // Add the data
  XLSX.utils.sheet_add_aoa(ws, excelData, { origin: `A${companyDetails.length + 1}` })

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Category
    { wch: 20 }, // Date Manufactured
    { wch: 20 }, // Total Price
  ]
  ws['!cols'] = columnWidths

  // Add styles
  const headerStyle = {
    font: { bold: true, sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center' }
  }

  // Apply styles to header rows
  for (let i = 4; i <= 11; i++) {
    for (let j = 0; j <= 5; j++) {
      const cellAddress = XLSX.utils.encode_cell({ r: i, c: j })
      if (!ws[cellAddress]) {
        ws[cellAddress] = { v: '', s: headerStyle }
      } else {
        ws[cellAddress].s = headerStyle
      }
    }
  }

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

    
    // Save the file
    XLSX.writeFile(wb, 'product_report.xlsx')
  }

 
  // Vars
  const initialSelected: string = customInputData?.find(item => item.isSelected)?.value || ''

  // States
  const [selected, setSelected] = useState<string>(initialSelected)
  const [exportData, setExportData] = useState<ExportDialogProps['data']>(initialExportData)

  const handleChange = (prop: string | ChangeEvent<HTMLInputElement>) => {
    if (typeof prop === 'string') {
      setSelected(prop)
    } else {
      setSelected((prop.target as HTMLInputElement).value)
    }
  }

  useEffect(() => {
    setExportData(data ?? initialExportData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
        { 'Export Report'}
        <Typography component='span' className='flex flex-col text-center'>
          { 'Export Report as PDF or an Excel file' }
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
            {'Export'}
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

export default WarehouseCategoryExportDialog
