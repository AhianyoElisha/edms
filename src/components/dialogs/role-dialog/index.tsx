'use client'

// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import { Users } from '@/types/apps/ecommerceTypes'

type RoleDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  data?: CardDataType
}

type CardDataType = {
  title: string
  role: string
  avatars: string[]
  totalUsers: number
  user: Users[]
}

const RoleDialog = ({ open, setOpen, data }: RoleDialogProps) => {

  const handleClose = () => {
    setOpen(false)
  }




  return (
    <Dialog fullWidth maxWidth='md' scroll='body' open={open} onClose={handleClose}>
      <DialogTitle variant='h4' className='flex flex-col gap-2 text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        {data?.title ?? ''}
        <Typography component='span' className='flex flex-col text-center'>
          Role Staff
        </Typography>
      </DialogTitle>
      <form onSubmit={e => e.preventDefault()}>
        <DialogContent className='overflow-visible pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={handleClose} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          <Typography variant='h5' className='plb-5 sm:plb-6'>
            Role Permission Holders
          </Typography>
          <div className='flex flex-col overflow-x-auto'>
            <table className={tableStyles.table}>
              <tbody className='border-be'>
                <tr>
                  <th className='pis-0'>
                    <Typography className='font-medium whitespace-nowrap flex-grow min-is-[225px]' color='text.primary'>
                      Staff Name
                    </Typography>
                  </th>
                  <th className='!text-end pie-0'>
                    <Typography className='font-medium whitespace-nowrap flex-grow min-is-[225px]' color='text.primary'>
                      Other Details
                    </Typography>
                  </th>
                </tr>
                {data?.user.map((item, index) => {

                  return (
                    <tr key={index}>
                      <td className='pis-0'>
                        <Typography
                          className='font-medium whitespace-nowrap flex-grow min-is-[225px]'
                          color='text.primary'
                        >
                          { item.name}
                        </Typography>
                      </td>
                      <td className='!text-end pie-0'>
                        { (
                          <FormGroup className='flex-row justify-end flex-nowrap gap-6'>
                            <Typography className='font-medium whitespace-nowrap flex-grow min-is-[225px]' color='text.primary'>
                              {item.phone}
                            </Typography>
                            <Typography className='font-medium whitespace-nowrap flex-grow min-is-[225px]' color='text.primary'>
                              {item.status}
                            </Typography>
                          </FormGroup>
                        ) }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button variant='outlined' type='reset' color='secondary' onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default RoleDialog
