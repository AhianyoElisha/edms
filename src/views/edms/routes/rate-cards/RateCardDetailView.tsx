'use client'

// React Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import { Breadcrumbs } from '@mui/material'

// Component Imports
import Link from '@/components/Link'
import StyledBreadcrumb from '@/components/layout/shared/Breadcrumbs'

// Type Imports
import type { RateCardType, VolumePrice } from '@/types/apps/deliveryTypes'

// Actions Imports
import { deleteRateCard, deactivateRateCard, updateRateCard } from '@/libs/actions/ratecard.actions'
import { toast } from 'react-toastify'

interface RateCardDetailViewProps {
  rateCard: RateCardType
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const RateCardDetailView = ({ rateCard }: RateCardDetailViewProps) => {
  const router = useRouter()

  // Parse volume prices
  const volumePrices: VolumePrice[] = typeof rateCard.volumePrices === 'string'
    ? JSON.parse(rateCard.volumePrices)
    : rateCard.volumePrices

  const smallTruckPrices = volumePrices.filter(vp => vp.volume <= 18)
  const bigTruckPrices = volumePrices.filter(vp => vp.volume > 18)

  const handleToggleStatus = async () => {
    try {
      if (rateCard.isActive) {
        await deactivateRateCard(rateCard.$id)
        toast.success('Rate card deactivated')
      } else {
        await updateRateCard(rateCard.$id, { isActive: true })
        toast.success('Rate card activated')
      }
      router.refresh()
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this rate card? This action cannot be undone.')) {
      try {
        await deleteRateCard(rateCard.$id)
        toast.success('Rate card deleted')
        router.push('/edms/routes/rate-cards')
      } catch (error) {
        console.error('Error deleting rate card:', error)
        toast.error('Failed to delete rate card')
      }
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Breadcrumbs & Actions */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Breadcrumbs aria-label='breadcrumb'>
          <StyledBreadcrumb 
            component='a' 
            label='Dashboard' 
            onClick={() => router.push('/dashboard')} 
            icon={<i className='ri-home-line' />}
            className='cursor-pointer'
          />
          <StyledBreadcrumb 
            component='a' 
            label='Rate Cards' 
            onClick={() => router.push('/edms/routes/rate-cards')}
            className='cursor-pointer'
          />
          <StyledBreadcrumb label={`${rateCard.clientCode} - ${rateCard.routeCode}`} disabled />
        </Breadcrumbs>
        <div className='flex gap-2'>
          <Button
            variant='outlined'
            color='secondary'
            startIcon={<i className='ri-file-copy-line' />}
            component={Link}
            href={`/edms/routes/rate-cards/create?duplicate=${rateCard.$id}`}
          >
            Duplicate
          </Button>
          <Button
            variant='outlined'
            color={rateCard.isActive ? 'warning' : 'success'}
            startIcon={<i className={rateCard.isActive ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'} />}
            onClick={handleToggleStatus}
          >
            {rateCard.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='ri-edit-line' />}
            component={Link}
            href={`/edms/routes/rate-cards/${rateCard.$id}/edit`}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <div className='flex items-center gap-3 mb-2'>
                <Typography variant='h4'>
                  {rateCard.clientName}
                </Typography>
                <Chip
                  label={rateCard.isActive ? 'Active' : 'Inactive'}
                  color={rateCard.isActive ? 'success' : 'secondary'}
                  variant='tonal'
                />
              </div>
              <Typography variant='body1' color='text.secondary'>
                Client Code: <strong>{rateCard.clientCode}</strong>
              </Typography>
            </div>
            <div className='text-right'>
              <Typography variant='h5' color='primary'>
                {rateCard.routeCode}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {rateCard.routeDescription}
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      <Grid container spacing={6}>
        {/* Volume-Based Pricing */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title='Volume-Based Pricing'
              subheader='Rates by truck volume capacity (CBM = Cubic Meters)'
            />
            <CardContent>
              <Grid container spacing={4}>
                {/* Small Truck Section */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label='Small Truck (10-18 CBM)' 
                      color='primary' 
                      variant='filled'
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <TableContainer component={Paper} variant='outlined'>
                    <Table size='small'>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell><strong>Volume (CBM)</strong></TableCell>
                          <TableCell><strong>Tonnage</strong></TableCell>
                          <TableCell align='right'><strong>Rate</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {smallTruckPrices.map((tier) => (
                          <TableRow key={tier.volume} hover>
                            <TableCell>
                              <Typography variant='body2'>{tier.volume} CBM</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{tier.tonnage} tons</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body1' fontWeight='medium' color='primary.main'>
                                {formatCurrency(tier.rate)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                {/* Big Truck Section */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label='Big Truck (37-60 CBM)' 
                      color='secondary' 
                      variant='filled'
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <TableContainer component={Paper} variant='outlined'>
                    <Table size='small'>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell><strong>Volume (CBM)</strong></TableCell>
                          <TableCell><strong>Tonnage</strong></TableCell>
                          <TableCell align='right'><strong>Rate</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bigTruckPrices.map((tier) => (
                          <TableRow key={tier.volume} hover>
                            <TableCell>
                              <Typography variant='body2'>{tier.volume} CBM</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{tier.tonnage} tons</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body1' fontWeight='medium' color='secondary.main'>
                                {formatCurrency(tier.rate)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Validity Period */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title='Validity Period' />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Effective From
                  </Typography>
                  <Typography variant='h6'>
                    {formatDate(rateCard.effectiveFrom)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Effective To
                  </Typography>
                  <Typography variant='h6'>
                    {rateCard.effectiveTo ? formatDate(rateCard.effectiveTo) : 'No End Date'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Created
                  </Typography>
                  <Typography variant='body1'>
                    {formatDate(rateCard.$createdAt)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>
                    Last Updated
                  </Typography>
                  <Typography variant='body1'>
                    {formatDate(rateCard.$updatedAt)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title='Notes' />
            <CardContent>
              {rateCard.notes ? (
                <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
                  {rateCard.notes}
                </Typography>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  No additional notes for this rate card.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Danger Zone */}
        <Grid item xs={12}>
          <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardHeader 
              title='Danger Zone'
              titleTypographyProps={{ color: 'error' }}
            />
            <CardContent>
              <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                  <Typography variant='body1' fontWeight='medium'>
                    Delete this rate card
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Once deleted, this rate card cannot be recovered. Any trips using this rate card will need to be reassigned.
                  </Typography>
                </div>
                <Button
                  variant='outlined'
                  color='error'
                  startIcon={<i className='ri-delete-bin-line' />}
                  onClick={handleDelete}
                >
                  Delete Rate Card
                </Button>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}

export default RateCardDetailView
