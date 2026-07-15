'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

type DeleteConfirmationDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  description?: string
  confirmButtonText?: string
  isDeleting?: boolean
  onConfirm: (deletedBy: string) => void
}

/**
 * Reusable delete confirmation dialog.
 * Requires the person deleting to enter their name so an audit trail
 * of who performed the deletion can be kept.
 */
const DeleteConfirmationDialog = ({
  open,
  setOpen,
  title,
  description,
  confirmButtonText = 'Yes, Delete',
  isDeleting = false,
  onConfirm
}: DeleteConfirmationDialogProps) => {
  // States
  const [deletedBy, setDeletedBy] = useState('')

  // Clear the name field each time the dialog opens
  useEffect(() => {
    if (open) setDeletedBy('')
  }, [open])

  const handleClose = () => {
    if (!isDeleting) setOpen(false)
  }

  const handleConfirm = () => {
    if (!deletedBy.trim() || isDeleting) return
    onConfirm(deletedBy.trim())
  }

  return (
    <Dialog fullWidth maxWidth='xs' open={open} onClose={handleClose}>
      <DialogContent className='flex items-center flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        <i className='ri-error-warning-line text-[88px] mbe-6 text-warning' />
        <Typography variant='h4' className='mbe-2'>
          {title}
        </Typography>
        {description && <Typography color='text.primary'>{description}</Typography>}
        <TextField
          fullWidth
          autoFocus
          size='small'
          className='mbs-6'
          label='Your Name'
          placeholder='Enter your name to confirm'
          value={deletedBy}
          onChange={e => setDeletedBy(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleConfirm()
          }}
          disabled={isDeleting}
          helperText='This will be recorded so we know who performed this deletion'
        />
      </DialogContent>
      <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
        <Button variant='contained' color='error' onClick={handleConfirm} disabled={!deletedBy.trim() || isDeleting}>
          {isDeleting ? 'Deleting...' : confirmButtonText}
        </Button>
        <Button variant='outlined' color='secondary' onClick={handleClose} disabled={isDeleting}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmationDialog
