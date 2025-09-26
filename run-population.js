#!/usr/bin/env node

// Simple script to populate Appwrite database with permissions and roles
// R  { name: "deliveries.proof", module: "deliveries", action: "proof", description: "Manage delivery proof (photos, signatures)" },

const { Client, Databases, ID } = require('node-appwrite');

// ⚠️ CONFIGURE THESE VALUES BEFORE RUNNING ⚠️
const CONFIG = {
  APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1', // Replace with your endpoint
  PROJECT_ID: '68c8989000381e194776', // Replace with your project ID
  DATABASE_ID: '68d5e82e00304125c0ae', // Replace with your database ID
  API_KEY: 'standard_d66eacaf9cc16d0614716c5e6d9451e1d17230bd5bdf343f6a1544e8ac79bff9238d57512830ea11a4ec4b2d5dd1d9d7962f8e8eb9c2fcff76c2d05d46fe61f6a789f81f7d6a4efb10c33c448640a4648289216fdd3001642375d7d053c76c1c56241a0b2c453d80f05941a7602ba5a9a51a72ddf0a843f4f90cc0cff3cdc194' // Replace with your API key (with database write permissions)
};

// Initialize Appwrite
const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(CONFIG.APPWRITE_ENDPOINT)
  .setProject(CONFIG.PROJECT_ID)
  .setKey(CONFIG.API_KEY);

const PERMISSIONS_COLLECTION_ID = '68d5e91c00199b41987c';
const ROLES_COLLECTION_ID = '68d5e8650013cd602cbd';

// All permissions (110 total)
const permissions = [
  { name: "dashboard.view", displayName: "View Dashboard", module: "dashboard", action: "view", description: "View main dashboard and statistics" },
  { name: "dashboard.analytics", displayName: "View Analytics", module: "dashboard", action: "analytics", description: "Access advanced analytics features" },
  { name: "packages.view", displayName: "View Packages", module: "packages", action: "view", description: "View package listings and details" },
  { name: "packages.create", displayName: "Create Package", module: "packages", action: "create", description: "Create new packages (drivers create packages)" },
  { name: "packages.edit", displayName: "Edit Package", module: "packages", action: "edit", description: "Edit existing packages" },
  { name: "packages.delete", displayName: "Delete Package", module: "packages", action: "delete", description: "Delete packages" },
  { name: "packages.manage", displayName: "Manage Packages", module: "packages", action: "manage", description: "Full package management" },
  { name: "packages.tracking", displayName: "Track Packages", module: "packages", action: "tracking", description: "Access package tracking features" },
  { name: "packages.history", displayName: "View Package History", module: "packages", action: "history", description: "View package history and audit trail" },
  { name: "packages.bulkimport", displayName: "Bulk Import Packages", module: "packages", action: "bulkimport", description: "Import packages in bulk" },
  { name: "packages.export", displayName: "Export Packages", module: "packages", action: "export", description: "Export package data" },
  { name: "manifests.view", displayName: "View Manifests", module: "manifests", action: "view", description: "View manifest listings and details" },
  { name: "manifests.create", displayName: "Create Manifests", module: "manifests", action: "create", description: "Create new manifests" },
  { name: "manifests.edit", displayName: "Edit Manifests", module: "manifests", action: "edit", description: "Edit existing manifests" },
  { name: "manifests.delete", displayName: "Delete Manifests", module: "manifests", action: "delete", description: "Delete manifests" },
  { name: "manifests.manage", displayName: "Manage Manifests", module: "manifests", action: "manage", description: "Full manifest management" },
  { name: "manifests.approve", displayName: "Approve Manifests", module: "manifests", action: "approve", description: "Approve/reject manifests" },
  { name: "manifests.assign", displayName: "Assign Manifests", module: "manifests", action: "assign", description: "Assign manifests to users with driver role" },
  { name: "manifests.load", displayName: "Load Manifests", module: "manifests", action: "load", description: "Mark manifests as loaded" },
  { name: "manifests.complete", displayName: "Complete Manifests", module: "manifests", action: "complete", description: "Mark manifests as completed" },
  { name: "pickuplocations.view", displayName: "View Pickup Locations", module: "pickuplocations", action: "view", description: "View pickup locations" },
  { name: "pickuplocations.create", displayName: "Create Pickup Locations", module: "pickuplocations", action: "create", description: "Create new pickup locations" },
  { name: "pickuplocations.edit", displayName: "Edit Pickup Locations", module: "pickuplocations", action: "edit", description: "Edit pickup locations" },
  { name: "pickuplocations.delete", displayName: "Delete Pickup Locations", module: "pickuplocations", action: "delete", description: "Delete pickup locations" },
  { name: "pickuplocations.manage", displayName: "Manage Pickup Locations", module: "pickuplocations", action: "manage", description: "Full pickup location management" },
  { name: "dropofflocations.view", displayName: "View Dropoff Locations", module: "dropofflocations", action: "view", description: "View dropoff locations" },
  { name: "dropofflocations.create", displayName: "Create Dropoff Locations", module: "dropofflocations", action: "create", description: "Create new dropoff locations" },
  { name: "dropofflocations.edit", displayName: "Edit Dropoff Locations", module: "dropofflocations", action: "edit", description: "Edit dropoff locations" },
  { name: "dropofflocations.delete", displayName: "Delete Dropoff Locations", module: "dropofflocations", action: "delete", description: "Delete dropoff locations" },
  { name: "dropofflocations.manage", displayName: "Manage Dropoff Locations", module: "dropofflocations", action: "manage", description: "Full dropoff location management" },
  { name: "vehicles.view", displayName: "View Vehicles", module: "vehicles", action: "view", description: "View vehicle listings and details" },
  { name: "vehicles.create", displayName: "Create Vehicles", module: "vehicles", action: "create", description: "Add new vehicles to fleet" },
  { name: "vehicles.edit", displayName: "Edit Vehicles", module: "vehicles", action: "edit", description: "Edit vehicle information" },
  { name: "vehicles.delete", displayName: "Delete Vehicles", module: "vehicles", action: "delete", description: "Remove vehicles from fleet" },
  { name: "vehicles.manage", displayName: "Manage Vehicles", module: "vehicles", action: "manage", description: "Full vehicle management" },
  { name: "vehicles.assign", displayName: "Assign Vehicles", module: "vehicles", action: "assign", description: "Assign vehicles to users with driver role" },
  { name: "vehicles.maintenance", displayName: "Manage Vehicle Maintenance", module: "vehicles", action: "maintenance", description: "Manage vehicle maintenance" },
  { name: "vehicles.tracking", displayName: "Access Vehicle Tracking", module: "vehicles", action: "tracking", description: "Access vehicle tracking/GPS features" },
  { name: "vehicles.fuel", displayName: "Manage Fuel Records", module: "vehicles", action: "fuel", description: "Manage fuel records and monitoring" },
  { name: "routes.view", displayName: "View Routes", module: "routes", action: "view", description: "View route listings and details" },
  { name: "routes.create", displayName: "Create Routes", module: "routes", action: "create", description: "Create new routes" },
  { name: "routes.edit", displayName: "Edit Routes", module: "routes", action: "edit", description: "Edit existing routes" },
  { name: "routes.delete", displayName: "Delete Routes", module: "routes", action: "delete", description: "Delete routes" },
  { name: "routes.manage", displayName: "Manage Routes", module: "routes", action: "manage", description: "Full route management" },
  { name: "routes.optimize", displayName: "Optimize Routes", module: "routes", action: "optimize", description: "Access route optimization features" },
  { name: "routes.analytics", displayName: "View Route Analytics", module: "routes", action: "analytics", description: "View route performance analytics" },
  { name: "ratecards.view", displayName: "View Rate Cards", module: "ratecards", action: "view", description: "View rate cards" },
  { name: "ratecards.create", displayName: "Create Rate Cards", module: "ratecards", action: "create", description: "Create new rate cards" },
  { name: "ratecards.edit", displayName: "Edit Rate Cards", module: "ratecards", action: "edit", description: "Edit rate cards" },
  { name: "ratecards.delete", displayName: "Delete Rate Cards", module: "ratecards", action: "delete", description: "Delete rate cards" },
  { name: "ratecards.manage", displayName: "Manage Rate Cards", module: "ratecards", action: "manage", description: "Full rate card management" },
  { name: "ratecards.approve", displayName: "Approve Rate Cards", module: "ratecards", action: "approve", description: "Approve rate card changes" },
  { name: "ratecards.approve", displayName: "Approve Rate Cards", module: "ratecards", action: "approve", description: "Approve rate card changes" },
  { name: "trips.view", displayName: "View Trips", module: "trips", action: "view", description: "View trip listings and details" },
  { name: "trips.create", displayName: "Create Trips", module: "trips", action: "create", description: "Create new trips" },
  { name: "trips.edit", displayName: "Edit Trips", module: "trips", action: "edit", description: "Edit trip details" },
  { name: "trips.delete", displayName: "Delete Trips", module: "trips", action: "delete", description: "Delete trips" },
  { name: "trips.manage", displayName: "Manage Trips", module: "trips", action: "manage", description: "Full trip management" },
  { name: "trips.start", displayName: "Start Trips", module: "trips", action: "start", description: "Start trips" },
  { name: "trips.complete", displayName: "Complete Trips", module: "trips", action: "complete", description: "Complete trips" },
  { name: "trips.cancel", displayName: "Cancel Trips", module: "trips", action: "cancel", description: "Cancel trips" },
  { name: "trips.tracking", displayName: "Track Trips", module: "trips", action: "tracking", description: "Track trip progress" },
  { name: "deliveries.view", displayName: "View Deliveries", module: "deliveries", action: "view", description: "View delivery listings and details" },
  { name: "deliveries.create", displayName: "Create Deliveries", module: "deliveries", action: "create", description: "Create new deliveries" },
  { name: "deliveries.edit", displayName: "Edit Deliveries", module: "deliveries", action: "edit", description: "Edit delivery details" },
  { name: "deliveries.delete", displayName: "Delete Deliveries", module: "deliveries", action: "delete", description: "Delete deliveries" },
  { name: "deliveries.manage", displayName: "Manage Deliveries", module: "deliveries", action: "manage", description: "Full delivery management" },
  { name: "deliveries.assign", displayName: "Assign Deliveries", module: "deliveries", action: "assign", description: "Assign deliveries to users with driver role" },
  { name: "deliveries.complete", displayName: "Complete Deliveries", module: "deliveries", action: "complete", description: "Mark deliveries as completed" },
  { name: "deliveries.tracking", displayName: "Track Deliveries", module: "deliveries", action: "tracking", description: "Track delivery status" },
  { name: "deliveries.proof", displayName: "Manage Delivery Proof", module: "deliveries", action: "proof", description: "Manage delivery proof (photos, signatures)" },
  { name: "expenses.view", displayName: "View Expenses", module: "expenses", action: "view", description: "View expense records" },
  { name: "expenses.create", displayName: "Create Expenses", module: "expenses", action: "create", description: "Create new expense records" },
  { name: "expenses.edit", displayName: "Edit Expenses", module: "expenses", action: "edit", description: "Edit expense records" },
  { name: "expenses.delete", displayName: "Delete Expenses", module: "expenses", action: "delete", description: "Delete expense records" },
  { name: "expenses.manage", displayName: "Manage Expenses", module: "expenses", action: "manage", description: "Full expense management" },
  { name: "expenses.approve", displayName: "Approve Expenses", module: "expenses", action: "approve", description: "Approve expense claims" },
  { name: "expenses.reports", displayName: "Generate Expense Reports", module: "expenses", action: "reports", description: "Generate expense reports" },
  { name: "tracking.view", displayName: "View Tracking Information", module: "tracking", action: "view", description: "View tracking information" },
  { name: "tracking.realtime", displayName: "Access Real-Time Tracking", module: "tracking", action: "realtime", description: "Access real-time tracking" },
  { name: "tracking.history", displayName: "View Tracking History", module: "tracking", action: "history", description: "View tracking history" },
  { name: "tracking.geofence", displayName: "Manage Geofences", module: "tracking", action: "geofence", description: "Manage geofences" },
  { name: "users.view", displayName: "View Users", module: "users", action: "view", description: "View user profiles" },
  { name: "users.create", displayName: "Create Users", module: "users", action: "create", description: "Create new user accounts" },
  { name: "users.edit", displayName: "Edit Users", module: "users", action: "edit", description: "Edit user information" },
  { name: "users.delete", displayName: "Delete Users", module: "users", action: "delete", description: "Delete user accounts" },
  { name: "users.manage", displayName: "Manage Users", module: "users", action: "manage", description: "Full user management" },
  { name: "users.roles", displayName: "Manage User Roles", module: "users", action: "roles", description: "Manage user roles" },
  { name: "users.permissions", displayName: "Manage User Permissions", module: "users", action: "permissions", description: "Manage user permissions" },
  { name: "roles.view", displayName: "View Roles", module: "roles", action: "view", description: "View role listings" },
  { name: "roles.create", displayName: "Create Roles", module: "roles", action: "create", description: "Create new roles" },
  { name: "roles.edit", displayName: "Edit Roles", module: "roles", action: "edit", description: "Edit role settings" },
  { name: "roles.delete", displayName: "Delete Roles", module: "roles", action: "delete", description: "Delete roles" },
  { name: "roles.manage", displayName: "Manage Roles", module: "roles", action: "manage", description: "Full role management" },
  { name: "permissions.view", displayName: "View Permissions", module: "permissions", action: "view", description: "View permission listings" },
  { name: "permissions.create", displayName: "Create Permissions", module: "permissions", action: "create", description: "Create new permissions" },
  { name: "permissions.edit", displayName: "Edit Permissions", module: "permissions", action: "edit", description: "Edit permissions" },
  { name: "permissions.delete", displayName: "Delete Permissions", module: "permissions", action: "delete", description: "Delete permissions" },
  { name: "permissions.manage", displayName: "Manage Permissions", module: "permissions", action: "manage", description: "Full permission management" },
  { name: "permissions.assign", displayName: "Assign Permissions", module: "permissions", action: "assign", description: "Assign permissions to roles" },
  { name: "notifications.view", displayName: "View Notifications", module: "notifications", action: "view", description: "View notifications" },
  { name: "notifications.create", displayName: "Create Notifications", module: "notifications", action: "create", description: "Create/send notifications" },
  { name: "notifications.manage", displayName: "Manage Notifications", module: "notifications", action: "manage", description: "Full notification management" },
  { name: "notifications.sms", displayName: "Send SMS Notifications", module: "notifications", action: "sms", description: "Send SMS notifications" },
  { name: "notifications.email", displayName: "Send Email Notifications", module: "notifications", action: "email", description: "Send email notifications" },
  { name: "notifications.push", displayName: "Send Push Notifications", module: "notifications", action: "push", description: "Send push notifications" },
  { name: "notifications.bulk", displayName: "Send Bulk Notifications", module: "notifications", action: "bulk", description: "Send bulk notifications" },
  { name: "reports.view", displayName: "View Reports", module: "reports", action: "view", description: "View reports dashboard" },
  { name: "reports.daily", displayName: "Generate Daily Reports", module: "reports", action: "daily", description: "Generate daily operational reports" },
  { name: "reports.deliveryperformance", displayName: "View Delivery Performance Reports", module: "reports", action: "deliveryperformance", description: "View delivery performance reports" },
  { name: "reports.driverperformance", displayName: "View Driver Performance Reports", module: "reports", action: "driverperformance", description: "View performance of users with driver role" },
  { name: "reports.routeanalysis", displayName: "Generate Route Analysis Reports", module: "reports", action: "routeanalysis", description: "Generate route analysis reports" },
  { name: "reports.revenue", displayName: "View Revenue Reports", module: "reports", action: "revenue", description: "View revenue reports" },
  { name: "reports.expenses", displayName: "View Expense Reports", module: "reports", action: "expenses", description: "View expense reports" },
  { name: "reports.profitability", displayName: "Generate Profitability Analysis", module: "reports", action: "profitability", description: "Generate profitability analysis" },
  { name: "reports.invoicing", displayName: "View Invoicing Reports", module: "reports", action: "invoicing", description: "View invoicing reports" },
  { name: "reports.packagevolume", displayName: "View Package Volume Reports", module: "reports", action: "packagevolume", description: "View package volume reports" },
  { name: "reports.export", displayName: "Export Reports", module: "reports", action: "export", description: "Export reports to various formats" },
  { name: "reports.schedule", displayName: "Schedule Automated Reports", module: "reports", action: "schedule", description: "Schedule automated reports" }
];

// Roles to create (5 total - excluding admin)
const roles = [
  {
    name: "operations",
    displayName: "Operations Manager", 
    description: "Manages day-to-day business operations"
  },
  {
    name: "driver", 
    displayName: "Driver",
    description: "User with driver role - field operations and package creation"
  },
  {
    name: "pickupagent",
    displayName: "Pickup Agent",
    description: "Handles package collection operations"
  },
];

async function createPermissions() {
  console.log('🚀 Starting to create permissions...');
  let successCount = 0;
  
  for (let i = 0; i < permissions.length; i++) {
    const permission = permissions[i];
    try {
      await databases.createDocument(
        CONFIG.DATABASE_ID,
        PERMISSIONS_COLLECTION_ID,
        ID.unique(),
        permission
      );
      successCount++;
      console.log(`✅ Created permission: ${permission.module}.${permission.action} (${i + 1}/${permissions.length})`);
    } catch (error) {
      console.error(`❌ Failed to create permission ${permission.module}.${permission.action}:`, error.message);
    }
  }
  
  console.log(`🎉 Successfully created ${successCount}/${permissions.length} permissions!`);
  return successCount;
}

async function createRoles() {
  console.log('🚀 Starting to create roles...');
  let successCount = 0;
  
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    try {
      await databases.createDocument(
        CONFIG.DATABASE_ID,
        ROLES_COLLECTION_ID, 
        ID.unique(),
        role
      );
      successCount++;
      console.log(`✅ Created role: ${role.name} (${i + 1}/${roles.length})`);
    } catch (error) {
      console.error(`❌ Failed to create role ${role.name}:`, error.message);
    }
  }
  
  console.log(`🎉 Successfully created ${successCount}/${roles.length} roles!`);
  return successCount;
}

async function main() {
  // Validate configuration
  if (CONFIG.PROJECT_ID === 'YOUR_PROJECT_ID' || 
      CONFIG.DATABASE_ID === 'YOUR_DATABASE_ID' ||
      CONFIG.API_KEY === 'YOUR_API_KEY') {
    console.error('❌ Please configure the CONFIG object with your Appwrite details!');
    process.exit(1);
  }

  try {
    console.log('🎯 Starting Appwrite database population...\n');
    console.log(`📋 Configuration:`);
    console.log(`   - Project ID: ${CONFIG.PROJECT_ID}`);
    console.log(`   - Database ID: ${CONFIG.DATABASE_ID}`);
    console.log(`   - Endpoint: ${CONFIG.APPWRITE_ENDPOINT}\n`);
    
    const permissionCount = await createPermissions();
    console.log('');
    const roleCount = await createRoles();
    
    console.log('\n🎊 Database population completed!');
    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Permissions created: ${permissionCount}/${permissions.length}`);
    console.log(`   ✅ Roles created: ${roleCount}/${roles.length}`); 
    console.log(`   ℹ️  Admin role: Already exists (skipped)`);
    console.log(`   📊 Total items: ${permissionCount + roleCount} documents created`);
    
  } catch (error) {
    console.error('\n💥 Fatal error during population:', error.message);
    process.exit(1);
  }
}

// Run the script
main();