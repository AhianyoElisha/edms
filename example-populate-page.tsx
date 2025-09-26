// Example usage in your Next.js app
// Create: src/app/admin/populate/page.tsx

'use client'

import { useState } from 'react'
import { populatePermissionsAndRoles } from '@/libs/actions/populate-permissions'
import { Button, Card, CardContent, Typography, Alert } from '@mui/material'

export default function PopulatePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handlePopulate = async () => {
    setIsLoading(true)
    try {
      const result = await populatePermissionsAndRoles()
      setResult(result)
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Populate Database
        </Typography>
        
        <Typography variant="body1" paragraph>
          This will create 110 permissions and 5 roles in your Appwrite database.
        </Typography>

        <Button 
          variant="contained" 
          onClick={handlePopulate}
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? 'Populating...' : 'Populate Permissions & Roles'}
        </Button>

        {result && (
          <Alert 
            severity={result.success ? 'success' : 'error'} 
            sx={{ mt: 2 }}
          >
            {result.success 
              ? `✅ Created ${result.permissions.length} permissions and ${result.roles.length} roles!`
              : `❌ Error: ${result.error}`
            }
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}