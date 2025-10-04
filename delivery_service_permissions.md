# Delivery Service Application - Permissions Structure

## Overview
This document provides a comprehensive list of permissions for the delivery service application based on the database schema and vertical menu structure. These permissions are designed to support role-based access control (RBAC) for all modules and features.

## Permission Naming Convention
Permissions follow the format: `{module}.{action}`
- **module**: The main functional area (packages, manifests, vehicles, etc.)
- **action**: The specific operation (view, create, edit, delete, manage, etc.)

## Core Modules & Permissions

### 1. Dashboard Module
```
dashboard.view - View main dashboard and statistics
dashboard.analytics - Access advanced analytics features
```

### 2. Package Management Module
```
packages.view - View package listings and details
packages.create - Create new packages (drivers create packages)
packages.edit - Edit existing packages
packages.delete - Delete packages
packages.manage - Full package management (includes all above)
packages.tracking - Access package tracking features
packages.history - View package history and audit trail
packages.bulk_import - Import packages in bulk
packages.export - Export package data
```

### 3. Manifests Module
```
manifests.view - View manifest listings and details
manifests.create - Create new manifests
manifests.edit - Edit existing manifests
manifests.delete - Delete manifests
manifests.manage - Full manifest management
manifests.approve - Approve/reject manifests
manifests.assign - Assign manifests to users with driver role
manifests.load - Mark manifests as loaded
manifests.complete - Mark manifests as completed
```

### 4. Locations Module
```
pickuplocations.view - View pickup locations
pickuplocations.create - Create new pickup locations
pickuplocations.edit - Edit pickup locations
pickuplocations.delete - Delete pickup locations
pickuplocations.manage - Full pickup location management

dropofflocations.view - View dropoff locations
dropofflocations.create - Create new dropoff locations
dropofflocations.edit - Edit dropoff locations
dropofflocations.delete - Delete dropoff locations
dropofflocations.manage - Full dropoff location management
```

### 5. Vehicle Management Module
```
vehicles.view - View vehicle listings and details
vehicles.create - Add new vehicles to fleet
vehicles.edit - Edit vehicle information
vehicles.delete - Remove vehicles from fleet
vehicles.manage - Full vehicle management
vehicles.assign - Assign vehicles to users with driver role
vehicles.maintenance - Manage vehicle maintenance
vehicles.tracking - Access vehicle tracking/GPS features
vehicles.fuel - Manage fuel records and monitoring
```

### 6. Routes Module
```
routes.view - View route listings and details
routes.create - Create new routes
routes.edit - Edit existing routes
routes.delete - Delete routes
routes.manage - Full route management
routes.optimize - Access route optimization features
routes.analytics - View route performance analytics

ratecards.view - View rate cards
ratecards.create - Create new rate cards
ratecards.edit - Edit rate cards
ratecards.delete - Delete rate cards
ratecards.manage - Full rate card management
ratecards.approve - Approve rate card changes
```

### 7. Trips Module
```
trips.view - View trip listings and details
trips.create - Create/plan new trips
trips.edit - Edit trip information
trips.delete - Cancel/delete trips
trips.manage - Full trip management
trips.start - Start/initiate trips
trips.complete - Complete trips
trips.track - Track active trips
trips.analytics - View trip analytics and reports
```

### 8. Deliveries Module
```
deliveries.view - View delivery listings and status
deliveries.create - Create delivery records
deliveries.edit - Update delivery information
deliveries.manage - Full delivery management
deliveries.complete - Mark deliveries as completed
deliveries.fail - Mark deliveries as failed
deliveries.return - Process delivery returns
deliveries.photo - Upload/manage delivery photos
deliveries.signature - Manage delivery signatures
deliveries.tracking - Access real-time delivery tracking
```

### 9. Trip Expenses Module
```
expenses.view - View expense listings and details
expenses.create - Create new expense records
expenses.edit - Edit expense information
expenses.delete - Delete expense records
expenses.approve - Approve/reject expense claims
expenses.manage - Full expense management
expenses.report - Generate expense reports
expenses.receipt - Upload/manage receipts
```

### 10. Tracking & History Module
```
tracking.realtime - Access real-time tracking features
tracking.history - View tracking history
tracking.analytics - Access tracking analytics
tracking.reports - Generate tracking reports
```

### 11. User Management Module
```
users.view - View user listings and profiles (includes users with driver role)
users.create - Create new user accounts
users.edit - Edit user information
users.delete - Delete user accounts
users.manage - Full user management
users.activate - Activate/deactivate users
users.reset_password - Reset user passwords

roles.view - View role listings and details
roles.create - Create new roles
roles.edit - Edit role information
roles.delete - Delete roles
roles.manage - Full role management

permissions.view - View permission listings
permissions.create - Create new permissions
permissions.edit - Edit permissions
permissions.delete - Delete permissions
permissions.manage - Full permission management
permissions.assign - Assign permissions to roles
```

### 12. Notifications Module
```
notifications.view - View notifications
notifications.create - Create/send notifications
notifications.manage - Full notification management
notifications.sms - Send SMS notifications
notifications.email - Send email notifications
notifications.push - Send push notifications
notifications.bulk - Send bulk notifications
```

### 13. Reports & Analytics Module
```
reports.view - View reports dashboard
reports.daily - Generate daily operational reports
reports.delivery_performance - View delivery performance reports
reports.driver_performance - View performance of users with driver role
reports.route_analysis - Generate route analysis reports
reports.revenue - View revenue reports
reports.expenses - View expense reports
reports.profitability - Generate profitability analysis
reports.invoicing - View invoicing reports
reports.package_volume - View package volume reports
reports.export - Export reports to various formats
reports.schedule - Schedule automated reports
```

## Role-Based Permission Matrix

### Admin Role
**Full Access**: All permissions across all modules
```
dashboard.*, packages.*, manifests.*, pickuplocations.*, dropofflocations.*,
vehicles.*, routes.*, ratecards.*, trips.*, deliveries.*, expenses.*,
tracking.*, users.*, roles.*, permissions.*, notifications.*, reports.*
```

### Operations Manager Role
**Business Operations Focus**
```
dashboard.view, dashboard.analytics,
packages.view, packages.create, packages.edit, packages.manage, packages.tracking, packages.history,
manifests.view, manifests.create, manifests.edit, manifests.manage, manifests.assign, manifests.approve,
pickuplocations.view, dropofflocations.view,
vehicles.view, vehicles.assign, vehicles.tracking,
users.view,
routes.view, routes.analytics,
trips.view, trips.create, trips.manage, trips.track, trips.analytics,
deliveries.view, deliveries.manage, deliveries.tracking,
expenses.view, expenses.approve, expenses.report,
reports.view, reports.daily, reports.delivery_performance, reports.route_analysis
```



### Driver Role
**Field Operations** (User with driver role creates packages)
```
dashboard.view,
packages.view, packages.create, packages.tracking,
manifests.view,
deliveries.view, deliveries.complete, deliveries.fail, deliveries.photo, deliveries.signature,
trips.view, trips.start, trips.complete, trips.track,
expenses.create, expenses.receipt,
tracking.realtime
```

### Pickup Agent Role
**Package Collection**
```
dashboard.view,
packages.view, packages.create, packages.tracking,
manifests.view, manifests.load,
pickuplocations.view,
deliveries.view,
tracking.realtime
```

### Delivery Agent Role
**Package Delivery**
```
dashboard.view,
packages.view, packages.tracking,
deliveries.view, deliveries.complete, deliveries.fail, deliveries.return, deliveries.photo, deliveries.signature,
dropofflocations.view,
tracking.realtime
```

## Database Population Format

### For Permissions Table
```json
[
  {"module": "dashboard", "action": "view", "description": "View main dashboard and statistics"},
  {"module": "dashboard", "action": "analytics", "description": "Access advanced analytics features"},
  {"module": "packages", "action": "view", "description": "View package listings and details"},
  {"module": "packages", "action": "create", "description": "Create new packages"},
  {"module": "packages", "action": "edit", "description": "Edit existing packages"},
  {"module": "packages", "action": "delete", "description": "Delete packages"},
  {"module": "packages", "action": "manage", "description": "Full package management"},
  {"module": "packages", "action": "tracking", "description": "Access package tracking features"},
  {"module": "packages", "action": "history", "description": "View package history and audit trail"},
  // ... continue for all permissions
]
```

### For Role-Permission Assignments
```json
{
  "admin": ["dashboard.*", "packages.*", "manifests.*", "vehicles.*", "drivers.*", "routes.*", "ratecards.*", "trips.*", "deliveries.*", "expenses.*", "ecommerce.*", "vendors.*", "products.*", "orders.*", "tracking.*", "users.*", "roles.*", "permissions.*", "clients.*", "notifications.*", "reports.*"],
  "operations_manager": ["dashboard.view", "dashboard.analytics", "packages.view", "packages.create", "packages.edit", "packages.manage", "packages.tracking", "packages.history", "manifests.view", "manifests.create", "manifests.edit", "manifests.manage", "manifests.assign", "manifests.approve", "pickuplocations.view", "dropofflocations.view", "vehicles.view", "vehicles.assign", "vehicles.tracking", "drivers.view", "drivers.assign", "drivers.performance", "routes.view", "routes.analytics", "trips.view", "trips.create", "trips.manage", "trips.track", "trips.analytics", "deliveries.view", "deliveries.manage", "deliveries.tracking", "expenses.view", "expenses.approve", "expenses.report", "clients.view", "clients.manage", "reports.view", "reports.daily", "reports.delivery_performance", "reports.route_analysis"],
  // ... continue for all roles
}
```

## Implementation Notes

1. **Wildcard Support**: Use `*` for full module access (e.g., `packages.*` gives all package permissions)
2. **Hierarchical Permissions**: Some permissions may include others (e.g., `manage` typically includes `view`, `create`, `edit`)
3. **Context-Sensitive**: Some permissions may be location or data-specific
4. **Audit Trail**: All permission checks should be logged for security auditing
5. **Dynamic Loading**: Permissions should be loaded dynamically based on user roles

This permission structure provides fine-grained access control while maintaining flexibility for your delivery service application.