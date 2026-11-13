// Next Imports
import type { Metadata } from 'next'

// Component Imports
import PortalManifests from '@/views/portal/PortalManifests'

export const metadata: Metadata = {
  title: 'My Manifests - Delivery Management'
}

const Page = () => <PortalManifests />

export default Page
