'use client'

// React Imports
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import { DatePicker } from '@mui/x-date-pickers-pro'
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers-pro'
import { LicenseInfo } from '@mui/x-license'
import dayjs from 'dayjs'

LicenseInfo.setLicenseKey('e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y')

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { RateCardType, VolumePrice } from '@/types/apps/deliveryTypes'

// Actions Imports
import { updateRateCard } from '@/libs/actions/ratecard.actions'

interface RateCardEditFormProps {
  rateCard: RateCardType
  userId: string
}

// Volume tier configuration
const SMALL_TRUCK_VOLUMES = [
  { volume: 10, revisedVolume: 10, tonnage: 3 },
  { volume: 14, revisedVolume: 15, tonnage: 3.5 },
  { volume: 18, revisedVolume: 18, tonnage: 5 }
]

const BIG_TRUCK_VOLUMES = [
  { volume: 37, revisedVolume: 37, tonnage: 7 },
  { volume: 41, revisedVolume: 41, tonnage: 8 },
  { volume: 50, revisedVolume: 50, tonnage: 10 },
  { volume: 55, revisedVolume: 55, tonnage: 12 },
  { volume: 60, revisedVolume: 60, tonnage: 15 }
]

const RateCardEditForm = ({ rateCard, userId }: RateCardEditFormProps) => {
  const router = useRouter()

  // Parse existing volume prices
  const existingVolumePrices: VolumePrice[] = typeof rateCard.volumePrices === 'string'
    ? JSON.parse(rateCard.volumePrices)
    : rateCard.volumePrices

  // Create initial volume price map
  const initialPriceMap: Record<number, number> = { 10: 0, 14: 0, 18: 0, 37: 0, 41: 0, 50: 0, 55: 0, 60: 0 }
  existingVolumePrices.forEach(vp => {
    initialPriceMap[vp.volume] = vp.rate
  })

  // States
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [clientName, setClientName] = useState(rateCard.clientName)
  const [clientCode, setClientCode] = useState(rateCard.clientCode)
  const [routeCode, setRouteCode] = useState(rateCard.routeCode)
  const [routeDescription, setRouteDescription] = useState(rateCard.routeDescription)
  const [effectiveFrom, setEffectiveFrom] = useState<dayjs.Dayjs | null>(
    rateCard.effectiveFrom ? dayjs(rateCard.effectiveFrom) : null
  )
  const [effectiveTo, setEffectiveTo] = useState<dayjs.Dayjs | null>(
    rateCard.effectiveTo ? dayjs(rateCard.effectiveTo) : null
  )
  const [isActive, setIsActive] = useState(rateCard.isActive)
  const [notes, setNotes] = useState(rateCard.notes || '')

  // Volume prices state
  const [volumePrices, setVolumePrices] = useState<Record<number, number>>(initialPriceMap)

  const handleClientCodeChange = (value: string) => {
    setClientCode(value.toUpperCase())
  }

  const handleVolumeRateChange = (volume: number, rate: string) => {
    const numericRate = parseFloat(rate) || 0
    setVolumePrices(prev => ({
      ...prev,
      [volume]: numericRate
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!clientName || !clientCode || !routeCode || !routeDescription) {
      toast.error('Please fill in all required fields')
      return
    }

    // Check if at least one volume has a rate
    const hasRates = Object.values(volumePrices).some(rate => rate > 0)
    if (!hasRates) {
      toast.error('Please enter at least one volume rate')
      return
    }

    if (!effectiveFrom) {
      toast.error('Please select an effective from date')
      return
    }

    try {
      setSubmitting(true)

      // Convert volume prices map to array format
      const volumePricesArray: VolumePrice[] = []
      
      SMALL_TRUCK_VOLUMES.forEach(tier => {
        volumePricesArray.push({
          volume: tier.volume,
          tonnage: tier.tonnage,
          rate: volumePrices[tier.volume] || 0
        })
      })
      
      BIG_TRUCK_VOLUMES.forEach(tier => {
        volumePricesArray.push({
          volume: tier.volume,
          tonnage: tier.tonnage,
          rate: volumePrices[tier.volume] || 0
        })
      })

      const updateData = {
        clientName: clientName.trim(),
        clientCode: clientCode.trim().toUpperCase(),
        routeCode: routeCode.trim(),
        routeDescription: routeDescription.trim(),
        volumePrices: volumePricesArray,
        effectiveFrom: effectiveFrom.toISOString(),
        effectiveTo: effectiveTo ? effectiveTo.toISOString() : undefined,
        isActive,
        notes: notes.trim() || undefined
      }

      await updateRateCard(rateCard.$id, updateData)

      toast.success('Rate card updated successfully!')
      router.push(`/edms/routes/rate-cards/${rateCard.$id}`)
    } catch (error) {
      console.error('Error updating rate card:', error)
      toast.error('Failed to update rate card. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={6}>
          {/* Info Alert */}
          <Grid item xs={12}>
            <Alert severity='info'>
              Modifying rates will affect future trips. Existing trips will retain their original rates.
            </Alert>
          </Grid>

          {/* Client Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Client Information
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label='Client Name'
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder='e.g., JUMIA'
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label='Client Code'
                      value={clientCode}
                      onChange={e => handleClientCodeChange(e.target.value)}
                      placeholder='e.g., JUM'
                      helperText='Unique identifier for the client (auto-uppercased)'
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Route Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Route Information
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label='Route Code'
                      value={routeCode}
                      onChange={e => setRouteCode(e.target.value)}
                      placeholder='e.g., Route A'
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label='Route Description'
                      value={routeDescription}
                      onChange={e => setRouteDescription(e.target.value)}
                      placeholder='e.g., GH-Primary-Tema'
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Volume-Based Pricing */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title='Volume-Based Pricing'
                subheader='Update rates for each truck volume tier (CBM = Cubic Meters)'
              />
              <CardContent>
                <Grid container spacing={4}>
                  {/* Small Truck Section */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label='Small Truck' 
                        color='primary' 
                        variant='outlined'
                        sx={{ mb: 2 }}
                      />
                    </Box>
                    <TableContainer component={Paper} variant='outlined'>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Volume (CBM)</TableCell>
                            <TableCell>Tonnage</TableCell>
                            <TableCell>Rate (GH₵)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {SMALL_TRUCK_VOLUMES.map(tier => (
                            <TableRow key={tier.volume}>
                              <TableCell>
                                <Typography variant='body2'>{tier.volume}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant='body2'>{tier.tonnage} tons</Typography>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type='number'
                                  size='small'
                                  value={volumePrices[tier.volume] || ''}
                                  onChange={e => handleVolumeRateChange(tier.volume, e.target.value)}
                                  InputProps={{
                                    startAdornment: <InputAdornment position='start'>GH₵</InputAdornment>
                                  }}
                                  inputProps={{ min: 0, step: 0.01 }}
                                  sx={{ width: 150 }}
                                />
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
                        label='Big Truck' 
                        color='secondary' 
                        variant='outlined'
                        sx={{ mb: 2 }}
                      />
                    </Box>
                    <TableContainer component={Paper} variant='outlined'>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Volume (CBM)</TableCell>
                            <TableCell>Tonnage</TableCell>
                            <TableCell>Rate (GH₵)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {BIG_TRUCK_VOLUMES.map(tier => (
                            <TableRow key={tier.volume}>
                              <TableCell>
                                <Typography variant='body2'>{tier.volume}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant='body2'>{tier.tonnage} tons</Typography>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type='number'
                                  size='small'
                                  value={volumePrices[tier.volume] || ''}
                                  onChange={e => handleVolumeRateChange(tier.volume, e.target.value)}
                                  InputProps={{
                                    startAdornment: <InputAdornment position='start'>GH₵</InputAdornment>
                                  }}
                                  inputProps={{ min: 0, step: 0.01 }}
                                  sx={{ width: 150 }}
                                />
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
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Validity Period
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label='Effective From'
                      value={effectiveFrom}
                      onChange={setEffectiveFrom}
                      slotProps={{ textField: { fullWidth: true, required: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label='Effective To (Optional)'
                      value={effectiveTo}
                      onChange={setEffectiveTo}
                      minDate={effectiveFrom || undefined}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true,
                          helperText: 'Leave empty if no end date'
                        } 
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isActive}
                          onChange={e => setIsActive(e.target.checked)}
                        />
                      }
                      label='Active'
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' className='mb-4'>
                  Additional Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label='Notes'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder='Any additional information about this rate card...'
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <div className='flex justify-end gap-4'>
              <Button
                variant='outlined'
                color='secondary'
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant='contained'
                type='submit'
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Grid>
        </Grid>
      </form>
    </LocalizationProvider>
  )
}

export default RateCardEditForm
