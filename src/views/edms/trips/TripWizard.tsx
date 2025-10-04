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
import StepTripDetails from './StepTripDetails'
import StepManifests from './StepManifests'
import StepPackages from './StepPackages'
import StepReview from './StepReview'
import StepperCustomDot from '@components/stepper-dot'

// Styled Component Imports
import StepperWrapper from '@core/styles/stepper'

// Type Imports
import type { TripWizardData, WizardStepProps } from './types'

const steps = [
  {
    title: 'Trip Details',
    subtitle: 'Driver, Vehicle & Route'
  },
  {
    title: 'Manifests',
    subtitle: 'Assign to Dropoff Locations'
  },
  {
    title: 'Packages',
    subtitle: 'Add Packages to Manifests'
  },
  {
    title: 'Review & Complete',
    subtitle: 'Confirm & Create Trip'
  }
]

// Styled Components
const ConnectorHeight = styled(StepConnector)(() => ({
  '& .MuiStepConnector-line': {
    minHeight: 20
  }
}))

const TripWizard = () => {
  // States
  const [activeStep, setActiveStep] = useState(0)
  const [wizardData, setWizardData] = useState<TripWizardData>({
    tripDetails: {
      driverId: '',
      driverName: '',
      vehicleId: '',
      vehicleNumber: '',
      routeId: '',
      routeName: '',
      startTime: '',
      notes: ''
    },
    manifests: [],
    packages: []
  })

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
        return <StepTripDetails {...commonProps} />
      case 1:
        return <StepManifests {...commonProps} />
      case 2:
        return <StepPackages {...commonProps} />
      case 3:
        return <StepReview {...commonProps} />
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

export default TripWizard
