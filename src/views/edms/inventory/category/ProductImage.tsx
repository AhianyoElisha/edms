'use client'

import { useCallback } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'
import { useDropzone } from 'react-dropzone'
import CustomAvatar from '@core/components/mui/Avatar'
import AppReactDropzone from '@/libs/styles/AppReactDropzone'
import { Control, useController } from 'react-hook-form'

interface ProductImageProps { 
  control: Control<any>
  index: number
  name: string
}

const Dropzone = styled(AppReactDropzone)<BoxProps>(({ theme }) => ({
  '& .dropzone': {
    minHeight: 'unset',
    padding: theme.spacing(12),
    [theme.breakpoints.down('sm')]: {
      paddingInline: theme.spacing(5)
    },
    '&+.MuiList-root .MuiListItem-root .file-name': {
      fontWeight: theme.typography.body1.fontWeight
    }
  }
}))

const ProductImage = ({ control, index, name }: ProductImageProps) => {
  const {
    field: { value, onChange },
    fieldState: { error }
  } = useController({
    name,
    control,
    rules: {
      required: 'Image is required',
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onChange([...value, ...acceptedFiles])
  }, [onChange, value])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const renderFilePreview = (file: File) => {
    if (file && file.type && file.type.startsWith('image')) {
      return <img width={38} height={38} alt={file.name} src={URL.createObjectURL(file)} />
    } else {
      return <i className='ri-file-text-line' />
    }
  }

  const handleRemoveFile = (fileToRemove: File) => {
    const updatedFiles = value.filter((file: File) => file !== fileToRemove)
    onChange(updatedFiles)
  }

  const handleRemoveAllFiles = () => {
    onChange([])
  }

  const fileList = value.map((file: File, fileIndex: number) => (
    <ListItem key={`${file.name}-${fileIndex}`} className='pis-4 plb-3'>
      <div className='file-details'>
        <div className='file-preview'>{renderFilePreview(file)}</div>
        <div>
          <Typography className='file-name font-medium' color='text.primary'>
            {file.name}
          </Typography>
          <Typography className='file-size' variant='body2'>
            {Math.round(file.size / 100) / 10 > 1000
              ? `${(Math.round(file.size / 100) / 10000).toFixed(1)} mb`
              : `${(Math.round(file.size / 100) / 10).toFixed(1)} kb`}
          </Typography>
        </div>
      </div>
      <IconButton onClick={() => handleRemoveFile(file)}>
        <i className='ri-close-line text-xl' />
      </IconButton>
    </ListItem>
  ))

  return (
    <Dropzone>
      <Card>
        <CardHeader title={`Inventory Item Image`} />
        <CardContent>
          <div {...getRootProps({ className: 'dropzone' })}>
            <input {...getInputProps()} />
            <div className='flex items-center flex-col gap-2 text-center'>
              <CustomAvatar variant='rounded' skin='light' color='secondary'>
                <i className='ri-upload-2-line' />
              </CustomAvatar>
              <Typography variant='h4'>Drag and Drop Your Image Here.</Typography>
              <Typography color='text.disabled'>or</Typography>
              <Button variant='outlined' size='small'>
                Browse Image
              </Button>
            </div>
          </div>
          {value && value.length > 0 && (
            <>
              <List>{fileList}</List>
              <div className='buttons'>
                <Button color='error' variant='outlined' onClick={handleRemoveAllFiles}>
                  Remove All
                </Button>
                {/* <Button variant='contained'>Upload Files</Button> */}
              </div>
            </>
          )}
          {error && (
            <Typography color="error" variant="caption" display="block" gutterBottom>
              {error.message}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Dropzone>
  )
}

export default ProductImage