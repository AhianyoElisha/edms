'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import Logo from '@components/layout/shared/Logo'
import { useImageVariant } from '@core/hooks/useImageVariant'
import type { Mode } from '@core/types'
import Loader from '@/components/layout/shared/Loader'
import { useAuth } from '@/contexts/AppwriteProvider'

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(30, { message: "Password cannot be longer than 30 characters." }),
});

const LoginForm = ({ mode }: { mode: Mode }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [loading, setLoading] = useState(false)
  const darkImg = '/images/pages/auth-v1-mask-1-dark.png'
  const lightImg = '/images/pages/auth-v1-mask-1-light.png'
  const { lang: locale } = useParams()
  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const router = useRouter()
  const { user, isLoading, login } = useAuth()
  const pathname = usePathname()


  useEffect(() => {
    if (!isLoading) {
      if (user) {
      console.log("Login Page =",user)
        // router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, pathname]);



  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })
  

  async function onSubmit(user: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      await login(user.username, user.password)
      router.push(`/dashboard`)
    } catch (error) {
      console.error(error)
      // Handle login error (e.g., show error message)
    }
  }

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  return (
    <div className='flex justify-center items-center min-bs-[100dvh] is-full relative p-6'>
      <Card className='flex flex-col sm:is-[460px]'>
        <CardContent className='p-6 sm:!p-12'>
          <Link href={'/'} className='flex justify-center items-center mbe-2'>
            <Logo />
          </Link>
          <div className='flex flex-col gap-5'>
            <div className='text-center'>
              <Typography className='mbs-1'>Please sign-in to your account</Typography>
            </div>
            <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
              <TextField
                autoFocus
                fullWidth
                label='Username'
                {...register('username')}
                error={!!errors.username}
                helperText={errors.username ? errors.username.message : ''}
              />
              <TextField
                fullWidth
                label='Password'
                type={isPasswordShown ? 'text' : 'password'}
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password ? errors.password.message : ''}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        size='small'
                        edge='end'
                        onClick={handleClickShowPassword}
                        onMouseDown={e => e.preventDefault()}
                      >
                        <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              {/* <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
                <Typography
                  className='text-end'
                  color='primary'
                  component={Link}
                  href={'/pages/auth/forgot-password-v1'}
                >
                  Forgot password?
                </Typography>
              </div> */}
              <Button fullWidth variant='contained' type='submit' style={{height: '50px'}}>
                {loading? <Loader /> : 'Log In'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      <img src={authBackground} alt="auth" className='absolute bottom-[5%] z-[-1] is-full max-md:hidden' />
    </div>
  )
}

export default LoginForm