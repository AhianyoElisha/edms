import type { ChildrenType, Direction } from '@core/types'
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import ReduxProvider from '@/redux-store/ReduxProvider'
import AppReactToastify from '@/libs/styles/AppReactToastify'
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'
import { AppwriteProvider } from '@/contexts/AppwriteProvider'

type Props = ChildrenType & {
  direction: Direction
}

const Providers = (props: Props) => {
  const { children, direction } = props
  const mode = getMode()
  const settingsCookie = getSettingsFromCookie()
  const systemMode = getSystemMode()

  return (
    <AppwriteProvider>
      <VerticalNavProvider>
        <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
          <ThemeProvider direction={direction} systemMode={systemMode}>
            <ReduxProvider>{children}</ReduxProvider>
            <AppReactToastify direction={direction} hideProgressBar />
          </ThemeProvider>
        </SettingsProvider>
      </VerticalNavProvider>
    </AppwriteProvider>
  )
}

export default Providers