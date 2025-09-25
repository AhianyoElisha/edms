// Component Imports
import Roles from '@views/mineralwater/roles'

// Data Imports
import { getUserData } from '@/app/server/actions'


const RolesApp = async () => {
  // Vars
  const data = await getUserData()

  return <Roles />
}

export default RolesApp
