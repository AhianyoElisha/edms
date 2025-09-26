// Font Imports
import { Inter } from 'next/font/google'

// MUI Imports
import Button from '@mui/material/Button'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Context Imports
import { IntersectionProvider } from '@/contexts/intersectionContext'

// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import FrontLayout from '@components/layout/front-pages'
import ScrollToTop from '@core/components/scroll-to-top'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/styles/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'


import { AppwriteProvider } from '@/contexts/AppwriteProvider'
import MaintenanceBanner from './MaintenanceBanner'

// Configure Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})
import AuthWrapper from '@/contexts/AuthWrapper'
import AttentionBanner from './AttentionBanner'
import DynamicAttentionBanner from './DynamicAttentionBanner'

export const metadata = {
  title: 'Ezar Delivery Services',
  description: 'Your Trusted Logistics Partner'
}

const Layout = ({ children }: ChildrenType) => {
  // Vars
  const systemMode = getSystemMode()

  return (
    <html id='__next'>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`flex is-full min-bs-full flex-auto flex-col ${inter.className}`} style={{ fontFamily: 'var(--font-inter)' }}>
        <Providers direction='ltr'>
          <AppwriteProvider>
              <BlankLayout systemMode={systemMode}>
                  <IntersectionProvider>
                    <FrontLayout>
                      {/* <AuthWrapper> */}
                        {/* <MaintenanceBanner /> */}
                        {children}
                        <ScrollToTop className='mui-fixed'>
                          <Button
                            variant='contained'
                            className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'
                            >
                            <i className='ri-arrow-up-line' />
                          </Button>
                        </ScrollToTop>
                  {/* </AuthWrapper> */}
                      <DynamicAttentionBanner />
                    </FrontLayout>
                  </IntersectionProvider>
              </BlankLayout>
          </AppwriteProvider>
        </Providers>
      </body>
    </html>
  )
}

export default Layout
