// React Imports
import edslogo from '@assets/edslight.png'
import edsdark from '@assets/edsdark.png'
import Image from 'next/image'
import { useTheme } from '@mui/material/styles'


const Logo = () => {
  const theme = useTheme()

  // ** Vars
  const isDark = theme.palette.mode === 'dark'
  return (
    <Image src={isDark ? edslogo : edsdark} alt="logo" width={60} />
  )
}

export default Logo
