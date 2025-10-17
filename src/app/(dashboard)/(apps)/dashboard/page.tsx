import { getUserData } from '@/app/server/actions'
import DashboardContent from './DashboardContent'

export const metadata = {
  title: 'Dashboard',
  description: 'eCommerce Dashboard'
}

export default async function DashboardECommerce() {
  return (
    <>
      <DashboardContent />
    </>
  )
}