// Next Imports
import type { Metadata } from 'next'

// Component Imports
import LossesGate from '@/views/edms/losses/LossesGate'

export const metadata: Metadata = {
  title: 'Driver Loss Sheet - Delivery Management'
}

const DriverLossSheetPage = ({ params }: { params: { driverId: string } }) => {
  return <LossesGate driverId={params.driverId} />
}

export default DriverLossSheetPage
