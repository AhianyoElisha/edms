import { Client, Databases, ID } from 'appwrite';

// Initialize Appwrite client
const client = new Client();
const databases = new Databases(client);

// Configure your Appwrite settings
client
  .setEndpoint('YOUR_APPWRITE_ENDPOINT') // Replace with your Appwrite endpoint
  .setProject('YOUR_PROJECT_ID'); // Replace with your project ID

const DATABASE_ID = 'YOUR_DATABASE_ID'; // Replace with your database ID
const PERMISSIONS_COLLECTION_ID = 'permissions'; // Your permissions collection ID
const ROLES_COLLECTION_ID = 'roles'; // Your roles collection ID

// All permissions based on our final schema
const permissions = [
  {
    module: "dashboard",
    action: "view",
    description: "View main dashboard and statistics"
  },
  {
    module: "dashboard",
    action: "analytics",
    description: "Access advanced analytics features"
  },
  {
    module: "packages",
    action: "view",
    description: "View package listings and details"
  },
  {
    module: "packages",
    action: "create",
    description: "Create new packages (drivers create packages)"
  },
  {
    module: "packages",
    action: "edit",
    description: "Edit existing packages"
  },
  {
    module: "packages",
    action: "delete",
    description: "Delete packages"
  },
  {
    module: "packages",
    action: "manage",
    description: "Full package management"
  },
  {
    module: "packages",
    action: "tracking",
    description: "Access package tracking features"
  },
  {
    module: "packages",
    action: "history",
    description: "View package history and audit trail"
  },
  {
    module: "packages",
    action: "bulk_import",
    description: "Import packages in bulk"
  },
  {
    module: "packages",
    action: "export",
    description: "Export package data"
  },
  {
    module: "manifests",
    action: "view",
    description: "View manifest listings and details"
  },
  {
    module: "manifests",
    action: "create",
    description: "Create new manifests"
  },
  {
    module: "manifests",
    action: "edit",
    description: "Edit existing manifests"
  },
  {
    module: "manifests",
    action: "delete",
    description: "Delete manifests"
  },
  {
    module: "manifests",
    action: "manage",
    description: "Full manifest management"
  },
  {
    module: "manifests",
    action: "approve",
    description: "Approve/reject manifests"
  },
  {
    module: "manifests",
    action: "assign",
    description: "Assign manifests to users with driver role"
  },
  {
    module: "manifests",
    action: "load",
    description: "Mark manifests as loaded"
  },
  {
    module: "manifests",
    action: "complete",
    description: "Mark manifests as completed"
  },
  {
    module: "pickuplocations",
    action: "view",
    description: "View pickup locations"
  },
  {
    module: "pickuplocations",
    action: "create",
    description: "Create new pickup locations"
  },
  {
    module: "pickuplocations",
    action: "edit",
    description: "Edit pickup locations"
  },
  {
    module: "pickuplocations",
    action: "delete",
    description: "Delete pickup locations"
  },
  {
    module: "pickuplocations",
    action: "manage",
    description: "Full pickup location management"
  },
  {
    module: "dropofflocations",
    action: "view",
    description: "View dropoff locations"
  },
  {
    module: "dropofflocations",
    action: "create",
    description: "Create new dropoff locations"
  },
  {
    module: "dropofflocations",
    action: "edit",
    description: "Edit dropoff locations"
  },
  {
    module: "dropofflocations",
    action: "delete",
    description: "Delete dropoff locations"
  },
  {
    module: "dropofflocations",
    action: "manage",
    description: "Full dropoff location management"
  },
  {
    module: "vehicles",
    action: "view",
    description: "View vehicle listings and details"
  },
  {
    module: "vehicles",
    action: "create",
    description: "Add new vehicles to fleet"
  },
  {
    module: "vehicles",
    action: "edit",
    description: "Edit vehicle information"
  },
  {
    module: "vehicles",
    action: "delete",
    description: "Remove vehicles from fleet"
  },
  {
    module: "vehicles",
    action: "manage",
    description: "Full vehicle management"
  },
  {
    module: "vehicles",
    action: "assign",
    description: "Assign vehicles to users with driver role"
  },
  {
    module: "vehicles",
    action: "maintenance",
    description: "Manage vehicle maintenance"
  },
  {
    module: "vehicles",
    action: "tracking",
    description: "Access vehicle tracking/GPS features"
  },
  {
    module: "vehicles",
    action: "fuel",
    description: "Manage fuel records and monitoring"
  },
  {
    module: "routes",
    action: "view",
    description: "View route listings and details"
  },
  {
    module: "routes",
    action: "create",
    description: "Create new routes"
  },
  {
    module: "routes",
    action: "edit",
    description: "Edit existing routes"
  },
  {
    module: "routes",
    action: "delete",
    description: "Delete routes"
  },
  {
    module: "routes",
    action: "manage",
    description: "Full route management"
  },
  {
    module: "routes",
    action: "optimize",
    description: "Access route optimization features"
  },
  {
    module: "routes",
    action: "analytics",
    description: "View route performance analytics"
  },
  {
    module: "ratecards",
    action: "view",
    description: "View rate cards"
  },
  {
    module: "ratecards",
    action: "create",
    description: "Create new rate cards"
  },
  {
    module: "ratecards",
    action: "edit",
    description: "Edit rate cards"
  },
  {
    module: "ratecards",
    action: "delete",
    description: "Delete rate cards"
  },
  {
    module: "ratecards",
    action: "manage",
    description: "Full rate card management"
  },
  {
    module: "ratecards",
    action: "approve",
    description: "Approve rate card changes"
  },
  {
    module: "trips",
    action: "view",
    description: "View trip listings and details"
  },
  {
    module: "trips",
    action: "create",
    description: "Create/plan new trips"
  },
  {
    module: "trips",
    action: "edit",
    description: "Edit trip information"
  },
  {
    module: "trips",
    action: "delete",
    description: "Cancel/delete trips"
  },
  {
    module: "trips",
    action: "manage",
    description: "Full trip management"
  },
  {
    module: "trips",
    action: "start",
    description: "Start/initiate trips"
  },
  {
    module: "trips",
    action: "complete",
    description: "Complete trips"
  },
  {
    module: "trips",
    action: "track",
    description: "Track active trips"
  },
  {
    module: "trips",
    action: "analytics",
    description: "View trip analytics and reports"
  },
  {
    module: "deliveries",
    action: "view",
    description: "View delivery listings and status"
  },
  {
    module: "deliveries",
    action: "create",
    description: "Create delivery records"
  },
  {
    module: "deliveries",
    action: "edit",
    description: "Update delivery information"
  },
  {
    module: "deliveries",
    action: "manage",
    description: "Full delivery management"
  },
  {
    module: "deliveries",
    action: "complete",
    description: "Mark deliveries as completed"
  },
  {
    module: "deliveries",
    action: "fail",
    description: "Mark deliveries as failed"
  },
  {
    module: "deliveries",
    action: "return",
    description: "Process delivery returns"
  },
  {
    module: "deliveries",
    action: "photo",
    description: "Upload/manage delivery photos"
  },
  {
    module: "deliveries",
    action: "signature",
    description: "Manage delivery signatures"
  },
  {
    module: "deliveries",
    action: "tracking",
    description: "Access real-time delivery tracking"
  },
  {
    module: "expenses",
    action: "view",
    description: "View expense listings and details"
  },
  {
    module: "expenses",
    action: "create",
    description: "Create new expense records"
  },
  {
    module: "expenses",
    action: "edit",
    description: "Edit expense information"
  },
  {
    module: "expenses",
    action: "delete",
    description: "Delete expense records"
  },
  {
    module: "expenses",
    action: "approve",
    description: "Approve/reject expense claims"
  },
  {
    module: "expenses",
    action: "manage",
    description: "Full expense management"
  },
  {
    module: "expenses",
    action: "report",
    description: "Generate expense reports"
  },
  {
    module: "expenses",
    action: "receipt",
    description: "Upload/manage receipts"
  },
  {
    module: "tracking",
    action: "realtime",
    description: "Access real-time tracking features"
  },
  {
    module: "tracking",
    action: "history",
    description: "View tracking history"
  },
  {
    module: "tracking",
    action: "analytics",
    description: "Access tracking analytics"
  },
  {
    module: "tracking",
    action: "reports",
    description: "Generate tracking reports"
  },
  {
    module: "users",
    action: "view",
    description: "View user listings and profiles (includes users with driver role)"
  },
  {
    module: "users",
    action: "create",
    description: "Create new user accounts"
  },
  {
    module: "users",
    action: "edit",
    description: "Edit user information"
  },
  {
    module: "users",
    action: "delete",
    description: "Delete user accounts"
  },
  {
    module: "users",
    action: "manage",
    description: "Full user management"
  },
  {
    module: "users",
    action: "activate",
    description: "Activate/deactivate users"
  },
  {
    module: "users",
    action: "reset_password",
    description: "Reset user passwords"
  },
  {
    module: "roles",
    action: "view",
    description: "View role listings and details"
  },
  {
    module: "roles",
    action: "create",
    description: "Create new roles"
  },
  {
    module: "roles",
    action: "edit",
    description: "Edit role information"
  },
  {
    module: "roles",
    action: "delete",
    description: "Delete roles"
  },
  {
    module: "roles",
    action: "manage",
    description: "Full role management"
  },
  {
    module: "permissions",
    action: "view",
    description: "View permission listings"
  },
  {
    module: "permissions",
    action: "create",
    description: "Create new permissions"
  },
  {
    module: "permissions",
    action: "edit",
    description: "Edit permissions"
  },
  {
    module: "permissions",
    action: "delete",
    description: "Delete permissions"
  },
  {
    module: "permissions",
    action: "manage",
    description: "Full permission management"
  },
  {
    module: "permissions",
    action: "assign",
    description: "Assign permissions to roles"
  },
  {
    module: "notifications",
    action: "view",
    description: "View notifications"
  },
  {
    module: "notifications",
    action: "create",
    description: "Create/send notifications"
  },
  {
    module: "notifications",
    action: "manage",
    description: "Full notification management"
  },
  {
    module: "notifications",
    action: "sms",
    description: "Send SMS notifications"
  },
  {
    module: "notifications",
    action: "email",
    description: "Send email notifications"
  },
  {
    module: "notifications",
    action: "push",
    description: "Send push notifications"
  },
  {
    module: "notifications",
    action: "bulk",
    description: "Send bulk notifications"
  },
  {
    module: "reports",
    action: "view",
    description: "View reports dashboard"
  },
  {
    module: "reports",
    action: "daily",
    description: "Generate daily operational reports"
  },
  {
    module: "reports",
    action: "delivery_performance",
    description: "View delivery performance reports"
  },
  {
    module: "reports",
    action: "driver_performance",
    description: "View performance of users with driver role"
  },
  {
    module: "reports",
    action: "route_analysis",
    description: "Generate route analysis reports"
  },
  {
    module: "reports",
    action: "revenue",
    description: "View revenue reports"
  },
  {
    module: "reports",
    action: "expenses",
    description: "View expense reports"
  },
  {
    module: "reports",
    action: "profitability",
    description: "Generate profitability analysis"
  },
  {
    module: "reports",
    action: "invoicing",
    description: "View invoicing reports"
  },
  {
    module: "reports",
    action: "package_volume",
    description: "View package volume reports"
  },
  {
    module: "reports",
    action: "export",
    description: "Export reports to various formats"
  },
  {
    module: "reports",
    action: "schedule",
    description: "Schedule automated reports"
  }
];

// Roles to create (excluding admin which already exists)
const roles = [
  {
    name: "Operations Manager",
    displayName: "Operations Manager",
    description: "Manages day-to-day business operations"
  },
  {
    name: "Route Manager",
    displayName: "Route Manager",
    description: "Manages routes, vehicles, and users with driver role"
  },
  {
    name: "Driver",
    displayName: "Driver",
    description: "User with driver role - field operations and package creation"
  },
  {
    name: "Pickup Agent",
    displayName: "Pickup Agent",
    description: "Handles package collection operations"
  },
  {
    name: "Delivery Agent",
    displayName: "Delivery Agent",
    description: "Handles package delivery operations"
  }
];

async function createPermissions() {
  console.log('🚀 Starting to create permissions...');
  
  for (let i = 0; i < permissions.length; i++) {
    const permission = permissions[i];
    try {
      const result = await databases.createDocument(
        DATABASE_ID,
        PERMISSIONS_COLLECTION_ID,
        ID.unique(),
        permission
      );
      console.log(`✅ Created permission: ${permission.module}.${permission.action} (${i + 1}/${permissions.length})`);
    } catch (error) {
      console.error(`❌ Failed to create permission ${permission.module}.${permission.action}:`, error);
    }
  }
  
  console.log(`🎉 Finished creating ${permissions.length} permissions!`);
}

async function createRoles() {
  console.log('🚀 Starting to create roles...');
  
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    try {
      const result = await databases.createDocument(
        DATABASE_ID,
        ROLES_COLLECTION_ID,
        ID.unique(),
        role
      );
      console.log(`✅ Created role: ${role.name} (${i + 1}/${roles.length})`);
    } catch (error) {
      console.error(`❌ Failed to create role ${role.name}:`, error);
    }
  }
  
  console.log(`🎉 Finished creating ${roles.length} roles!`);
}

async function populateDatabase() {
  try {
    console.log('🎯 Starting database population...\n');
    
    await createPermissions();
    console.log('\n');
    await createRoles();
    
    console.log('\n🎊 Database population completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Permissions created: ${permissions.length}`);
    console.log(`   - Roles created: ${roles.length}`);
    console.log(`   - Admin role: Already exists (skipped)`);
    
  } catch (error) {
    console.error('💥 Error during database population:', error);
  }
}

// Run the population script
populateDatabase();