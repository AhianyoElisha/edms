'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// MUI Imports
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'

// Type Imports
import { Logistics, Users } from '@/types/apps/ecommerceTypes'
import { getUserList } from '@/libs/actions/customer.action'
import { Autocomplete } from '@mui/material'
import { toast } from 'react-toastify'
import { addStaffToVehicleInDB } from '@/libs/actions/distribution.actions'


const AddStaffCard = ({ open, setOpen, logisticsId, onSuccess }: {
  open: boolean;
  setOpen: (open: boolean) => void;
  logisticsId: string;
  onSuccess?: () => Promise<Logistics[]>;
}) => {
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<Users[]>([])
  const [error, setError] = useState<string | null>(null)

  const formSchema = z.object({
    staffId: z.string().min(1, { message: "Staff selection is required" }),
  })

  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staffId: '',
    }
  })

  const fetchStaffList = useCallback(async () => {
    try {
      // Replace with your actual API call to fetch available staff
      const response = await getUserList()
      setStaffList(response?.rows as unknown as Users[])
    } catch (error) {
      console.error('Error fetching staff:', error)
      setError('Failed to load available staff')
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchStaffList()
    }
  }, [open, fetchStaffList])

  const onSubmit = async (data: { staffId: string }) => {
    try {
      setLoading(true)
      setError(null)
      
      // Replace with your actual API call
      const res = await addStaffToVehicleInDB(data, logisticsId)
      
      if (!res) {
        throw new Error('Failed to create customer')
      }
      
      toast.success('Customer added successfully')
      
      // Trigger refresh of parent data
      if (onSuccess) {
        await onSuccess()
      }

      setOpen(false)
      reset()
    } catch (error) {
      console.error('Error updating logistics:', error)
      setError(error instanceof Error ? error.message : 'Failed to update logistics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="add-staff-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle id="add-staff-dialog-title">Add Staff To Team</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 4 }}>
            Assign staff to vehicle for logistics operations
          </Typography>
          
          <Controller
            name="staffId"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Autocomplete
                id="staff-select"
                options={staffList || []}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => 
                option.$id === value?.$id
                }
                value={staffList.find(staff => staff.$id === value) || null}
                onChange={(_, newValue) => {
                  onChange(newValue?.$id || '')
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Staff"
                    error={!!error}
                    helperText={error}
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <div className="flex flex-col">
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        • {option.role}
                      </Typography>
                    </div>
                  </li>
                )}
                loading={loading}
                loadingText="Loading staff..."
                noOptionsText="No available staff found"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Updating...' : 'Assign Staff'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default AddStaffCard
