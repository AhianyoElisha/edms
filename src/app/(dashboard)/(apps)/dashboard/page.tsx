import { getUserData } from '@/app/server/actions'
import DashboardContent from './DashboardContent'
import EDMSDashboardContent from './EDMSDashboardContent'

export const metadata = {
  title: 'Dashboard',
  description: 'eCommerce Dashboard'
}

export default async function DashboardECommerce() {
  return (
    <>
      <EDMSDashboardContent />
    </>
  )
}