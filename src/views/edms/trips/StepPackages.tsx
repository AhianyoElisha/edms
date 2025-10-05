'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

// Type Imports
import type { WizardStepProps, PackageData } from './types'

const packageSizes = [
  { value: 'small', label: 'Small', icon: 'ri-inbox-line', description: 'Individual small package' },
  { value: 'medium', label: 'Medium', icon: 'ri-inbox-line', description: 'Medium-sized package' },
  { value: 'big', label: 'Big', icon: 'ri-box-3-line', description: 'Large package' },
  { value: 'bin', label: 'Bin', icon: 'ri-inbox-line', description: 'Bin with multiple small items' }
]

const StepPackages = ({ handleNext, handlePrev, wizardData, updateWizardData }: WizardStepProps) => {
  // Initialize packages from wizard data or empty
  const [packages, setPackages] = useState<PackageData[]>(wizardData.packages || [])
  const [expandedManifest, setExpandedManifest] = useState<string | false>(
    wizardData.manifests[0]?.tempId || false
  )

  const generateTrackingNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
    return `PKG${year}${month}${day}${random}`
  }

  const addPackageToManifest = (manifestTempId: string) => {
    const newPackage: PackageData = {
      tempId: `pkg-${Date.now()}-${Math.random()}`,
      manifestTempId,
      packageSize: 'medium',
      trackingNumber: generateTrackingNumber(),
      recipientName: '',
      recipientPhone: '',
      isBin: false,
      itemCount: undefined,
      notes: ''
    }
    setPackages([...packages, newPackage])
  }

  const removePackage = (packageTempId: string) => {
    setPackages(packages.filter(pkg => pkg.tempId !== packageTempId))
  }

  const updatePackage = (packageTempId: string, field: keyof PackageData, value: any) => {
    setPackages(prevPackages =>
      prevPackages.map(pkg =>
        pkg.tempId === packageTempId ? { ...pkg, [field]: value } : pkg
      )
    )
  }

  const updatePackageMultiple = (packageTempId: string, updates: Partial<PackageData>) => {
    console.log('updatePackageMultiple called with:', packageTempId, updates)
    setPackages(prevPackages => {
      const newPackages = prevPackages.map(pkg =>
        pkg.tempId === packageTempId ? { ...pkg, ...updates } : pkg
      )
      console.log('Updated packages:', newPackages.find(p => p.tempId === packageTempId))
      return newPackages
    })
  }

  const getPackagesByManifest = (manifestTempId: string) => {
    return packages.filter(pkg => pkg.manifestTempId === manifestTempId)
  }

  const getTotalPackages = () => packages.length

  const getPackageSizeCounts = () => {
    return packages.reduce((acc, pkg) => {
      acc[pkg.packageSize] = (acc[pkg.packageSize] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const getTotalItemCount = () => {
    // Total items including bin contents
    return packages.reduce((total, pkg) => {
      if (pkg.isBin && pkg.itemCount) {
        return total + pkg.itemCount
      }
      return total + 1 // Each non-bin package counts as 1
    }, 0)
  }

  const handleSubmit = () => {
    // Validate at least one package
    if (packages.length === 0) {
      alert('Please add at least one package to proceed')
      return
    }

    // Validate all packages have required fields
    for (const pkg of packages) {
      if (!pkg.recipientName || !pkg.recipientPhone) {
        alert('All packages must have recipient name and phone number')
        return
      }
    }

    updateWizardData({ packages })
    handleNext()
  }

  return (
    <Grid container spacing={5}>
      <Grid item xs={12}>
        <Typography variant='h5' className='mb-1'>
          Add Packages to Manifests
        </Typography>
        <Typography variant='body2' className='mb-2'>
          Add packages for each manifest. Quick and simple - just size, recipient, and tracking info.
        </Typography>
        <Typography variant='caption' color='primary'>
          💡 Tip: Use "Bin" for multiple small items grouped together. Track item count for easy verification.
        </Typography>
      </Grid>

      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <i className='ri-file-list-3-line text-2xl text-primary' />
                  <div>
                    <Typography variant='body2' color='text.secondary'>
                      Manifests
                    </Typography>
                    <Typography variant='h5' className='font-semibold'>
                      {wizardData.manifests.length}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <i className='ri-inbox-line text-2xl text-success' />
                  <div>
                    <Typography variant='body2' color='text.secondary'>
                      Packages/Bins
                    </Typography>
                    <Typography variant='h5' className='font-semibold'>
                      {getTotalPackages()}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <i className='ri-stack-line text-2xl text-info' />
                  <div>
                    <Typography variant='body2' color='text.secondary'>
                      Total Items
                    </Typography>
                    <Typography variant='h5' className='font-semibold'>
                      {getTotalItemCount()}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      (incl. bin contents)
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary' className='mb-2'>
                  By Size
                </Typography>
                <div className='flex flex-wrap gap-1'>
                  {Object.entries(getPackageSizeCounts()).map(([size, count]) => {
                    const sizeInfo = packageSizes.find(s => s.value === size)
                    return (
                      <Chip 
                        key={size} 
                        icon={<i className={sizeInfo?.icon || 'ri-inbox-line'} />}
                        label={`${sizeInfo?.label || size}: ${count}`} 
                        size='small' 
                        variant='tonal' 
                        color='primary'
                      />
                    )
                  })}
                  {getTotalPackages() === 0 && (
                    <Typography variant='caption' color='text.secondary'>
                      No packages yet
                    </Typography>
                  )}
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Manifests with Packages */}
      <Grid item xs={12}>
        <Typography variant='h6' className='mb-3'>
          Manifests & Packages
        </Typography>
        
        {wizardData.manifests.map((manifest, manifestIndex) => {
          const manifestPackages = getPackagesByManifest(manifest.tempId)
          
          return (
            <Accordion
              key={manifest.tempId}
              expanded={expandedManifest === manifest.tempId}
              onChange={() => setExpandedManifest(expandedManifest === manifest.tempId ? false : manifest.tempId)}
              className='mb-3'
            >
              <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                <div className='flex items-center justify-between w-full pr-4'>
                  <div>
                    <Typography variant='h6'>
                      {manifest.dropoffLocationName}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {manifest.manifestNumber} • {manifest.dropoffAddress}
                    </Typography>
                  </div>
                  <Chip 
                    label={`${manifestPackages.length} package(s)`}
                    color={manifestPackages.length > 0 ? 'primary' : 'default'}
                    size='small'
                    variant='tonal'
                  />
                </div>
              </AccordionSummary>
              
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Add Package Button */}
                  <Grid item xs={12}>
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<i className='ri-add-line' />}
                      onClick={() => addPackageToManifest(manifest.tempId)}
                    >
                      Add Package
                    </Button>
                  </Grid>

                  {/* Package List */}
                  {manifestPackages.length === 0 ? (
                    <Grid item xs={12}>
                      <Typography color='text.secondary' className='text-center py-4'>
                        No packages added yet. Click "Add Package" to start.
                      </Typography>
                    </Grid>
                  ) : (
                    manifestPackages.map((pkg, pkgIndex) => (
                      <Grid item xs={12} key={pkg.tempId}>
                        <Card variant='outlined'>
                          <CardContent>
                            <div className='flex items-start justify-between mb-3'>
                              <div className='flex items-center gap-2'>
                                <Typography variant='subtitle1' className='font-semibold'>
                                  Package #{pkgIndex + 1}
                                </Typography>
                                {pkg.isBin && pkg.itemCount && (
                                  <Chip 
                                    label={`${pkg.itemCount} items`} 
                                    size='small' 
                                    color='info' 
                                    variant='tonal'
                                    icon={<i className='ri-container-line' />}
                                  />
                                )}
                              </div>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => removePackage(pkg.tempId)}
                              >
                                <i className='ri-delete-bin-7-line' />
                              </IconButton>
                            </div>

                            <Grid container spacing={2}>
                              {/* Package Size Selection */}
                              <Grid item xs={12}>
                                <TextField
                                  select
                                  fullWidth
                                  label='Package Size'
                                  value={pkg.packageSize}
                                  onChange={(e) => {
                                    const newSize = e.target.value as PackageData['packageSize']
                                    console.log('Changing package size from', pkg.packageSize, 'to', newSize)
                                    // Update all related fields in a single state update
                                    updatePackageMultiple(pkg.tempId, {
                                      packageSize: newSize,
                                      isBin: newSize === 'bin',
                                      itemCount: newSize === 'bin' ? pkg.itemCount : undefined
                                    })
                                  }}
                                  required
                                  size='small'
                                  helperText={packageSizes.find(s => s.value === pkg.packageSize)?.description}
                                  SelectProps={{
                                    native: false,
                                    MenuProps: {
                                      PaperProps: {
                                        style: { maxHeight: 300 }
                                      }
                                    }
                                  }}
                                >
                                  {packageSizes.map(size => (
                                    <MenuItem key={size.value} value={size.value}>
                                      <div className='flex items-center gap-2'>
                                        <i className={size.icon} />
                                        <span>{size.label}</span>
                                      </div>
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Grid>

                              {/* Bin Item Count (only show if bin is selected) */}
                              {pkg.packageSize === 'bin' && (
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    type='number'
                                    label='Number of Items in Bin'
                                    value={pkg.itemCount || ''}
                                    onChange={(e) => updatePackage(pkg.tempId, 'itemCount', parseInt(e.target.value) || undefined)}
                                    required
                                    size='small'
                                    helperText='How many small items are in this bin?'
                                    InputProps={{ inputProps: { min: 1 } }}
                                  />
                                </Grid>
                              )}

                              <Grid item xs={12} sm={pkg.packageSize === 'bin' ? 6 : 12}>
                                <TextField
                                  fullWidth
                                  label='Tracking Number'
                                  value={pkg.trackingNumber}
                                  onChange={(e) => updatePackage(pkg.tempId, 'trackingNumber', e.target.value)}
                                  required
                                  size='small'
                                  InputProps={{
                                    startAdornment: <i className='ri-barcode-line mr-2' />
                                  }}
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <Divider className='my-2' />
                                <Typography variant='caption' color='text.secondary' className='font-semibold'>
                                  Recipient Information
                                </Typography>
                              </Grid>

                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label='Recipient Name'
                                  value={pkg.recipientName}
                                  onChange={(e) => updatePackage(pkg.tempId, 'recipientName', e.target.value)}
                                  required
                                  size='small'
                                />
                              </Grid>

                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label='Recipient Phone'
                                  value={pkg.recipientPhone}
                                  onChange={(e) => updatePackage(pkg.tempId, 'recipientPhone', e.target.value)}
                                  required
                                  size='small'
                                  type='tel'
                                />
                              </Grid>

                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={2}
                                  label='Notes (Optional)'
                                  value={pkg.notes || ''}
                                  onChange={(e) => updatePackage(pkg.tempId, 'notes', e.target.value)}
                                  size='small'
                                  placeholder='Any special instructions or notes...'
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Grid>

      <Grid item xs={12}>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
          <Button variant='outlined' onClick={handlePrev} fullWidth className='sm:w-auto'>
            Previous: Manifests
          </Button>
          <Button 
            variant='contained' 
            onClick={handleSubmit}
            disabled={packages.length === 0}
            fullWidth 
            className='sm:w-auto'
          >
            Next: Review & Submit
          </Button>
        </div>
      </Grid>
    </Grid>
  )
}

export default StepPackages
