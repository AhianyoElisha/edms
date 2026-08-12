'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepConnector from '@mui/material/StepConnector'
import StepLabel from '@mui/material/StepLabel'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

// Component Imports
import StepTripDetails from '../StepTripDetails'
import StepEditManifests from './StepEditManifests'
import StepEditReview from './StepEditReview'
import StepperCustomDot from '@components/stepper-dot'

// Styled Component Imports
import StepperWrapper from '@core/styles/stepper'

// Type Imports
import type { TripWizardData, ManifestData } from '../types'

const steps = [
  {
    title: 'Trip Details',
    subtitle: 'Driver, Vehicle & Route'
  },
  {
    title: 'Manifests',
    subtitle: 'Packages by Size & Location'
  },
  {
    title: 'Review & Save',
    subtitle: 'Confirm & Update Trip'
  }
]

// Styled Components
const ConnectorHeight = styled(StepConnector)(() => ({
  '& .MuiStepConnector-line': {
    minHeight: 20
  }
}))

// Relationship fields come back either populated or as a bare ID
const relationId = (value: any): string => (typeof value === 'object' && value ? value.$id || '' : value || '')

/**
 * Map a trip document (with populated relationships) onto the wizard shape used
 * by the create flow, so both flows can share the same steps.
 */
const buildInitialData = (tripData: any): TripWizardData => {
  const manifests: ManifestData[] = (tripData.manifests || [])
    .slice()
    .sort((a: any, b: any) => (a.dropoffSequence || 0) - (b.dropoffSequence || 0))
    .map((manifest: any) => {
      const dropoff = manifest.dropofflocation

      return {
        tempId: manifest.$id,
        $id: manifest.$id,
        status: manifest.status,
        deliveredCount: manifest.deliveredCount || 0,
        dropoffLocationId: relationId(dropoff),
        dropoffLocationName: typeof dropoff === 'object' ? dropoff?.locationName || '' : '',
        dropoffAddress: typeof dropoff === 'object' ? dropoff?.address || '' : '',
        manifestNumber: manifest.manifestNumber || '',
        packageSize: (manifest.packageSize || 'small') as 'small' | 'medium' | 'big',
        packageCount: manifest.packageCount || 0,
        estimatedArrival: manifest.estimatedArrival || '',
        notes: manifest.notes || ''
      }
    })

  return {
    tripDetails: {
      driverId: relationId(tripData.driver),
      driverName: typeof tripData.driver === 'object' ? tripData.driver?.name || '' : '',
      vehicleId: relationId(tripData.vehicle),
      vehicleNumber: typeof tripData.vehicle === 'object' ? tripData.vehicle?.vehicleNumber || '' : '',
      routeId: relationId(tripData.route),
      routeName: typeof tripData.route === 'object' ? tripData.route?.routeName || '' : '',
      startTime: tripData.startTime || tripData.tripDate || '',
      tonnage: tripData.tonnage ? String(tripData.tonnage) : '',
      tripCost: tripData.tripCost ?? undefined,
      notes: tripData.notes || ''
    },
    manifests
  }
}

const TripEditWizard = ({ tripData }: { tripData: any }) => {
  // States
  const [activeStep, setActiveStep] = useState(0)
  const [wizardData, setWizardData] = useState<TripWizardData>(() => buildInitialData(tripData))

  const handleNext = () => {
    if (activeStep !== steps.length - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  const handlePrev = () => {
    if (activeStep !== 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const updateWizardData = (data: Partial<TripWizardData>) => {
    setWizardData((prev: TripWizardData) => ({ ...prev, ...data }))
  }

  const getStepContent = () => {
    const commonProps = {
      activeStep,
      handleNext,
      handlePrev,
      steps,
      wizardData,
      updateWizardData
    }

    switch (activeStep) {
      case 0:
        return <StepTripDetails {...commonProps} nextLabel='Next: Manifests' />
      case 1:
        return <StepEditManifests {...commonProps} tripData={tripData} />
      case 2:
        return <StepEditReview {...commonProps} tripData={tripData} />
      default:
        return null
    }
  }

  return (
    <Card className='flex flex-col md:flex-row'>
      <CardContent className='max-md:border-be md:border-ie md:min-is-[300px]'>
        <StepperWrapper className='bs-full'>
          <Stepper activeStep={activeStep} connector={<ConnectorHeight />} orientation='vertical'>
            {steps.map((step, index) => {
              return (
                <Step key={index} onClick={() => setActiveStep(index)}>
                  <StepLabel StepIconComponent={StepperCustomDot} className='p-0'>
                    <div className='step-label cursor-pointer'>
                      <Typography className='step-number'>{`0${index + 1}`}</Typography>
                      <div>
                        <Typography className='step-title'>{step.title}</Typography>
                        <Typography className='step-subtitle'>{step.subtitle}</Typography>
                      </div>
                    </div>
                  </StepLabel>
                </Step>
              )
            })}
          </Stepper>
        </StepperWrapper>
      </CardContent>

      <CardContent className='flex-1 pbs-5'>{getStepContent()}</CardContent>
    </Card>
  )
}

export default TripEditWizard
