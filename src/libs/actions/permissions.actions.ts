import { ID, Query } from "appwrite";
import { databases } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';

export async function createPermission(permissionData: {
  name: string;
  displayName: string;
  module: string;
  action: string;
  description: string;
}) {
  try {
    const permission = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.permissions,
      ID.unique(),
      permissionData
    );

    return permission;
  } catch (error) {
    console.error('Error creating permission:', error);
    throw error;
  }
}

export async function getPermissionsList() {
  try {
    const permissions = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.permissions,
      [Query.orderAsc('module'), Query.orderAsc('displayName')]
    );

    return permissions;
  } catch (error) {
    console.error('Error fetching permissions:', error);
    throw error;
  }
}

export async function updatePermission(permissionId: string, permissionData: {
  displayName?: string;
  description?: string;
}) {
  try {
    const permission = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.permissions,
      permissionId,
      permissionData
    );

    return permission;
  } catch (error) {
    console.error('Error updating permission:', error);
    throw error;
  }
}

export async function deletePermission(permissionId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.permissions,
      permissionId
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting permission:', error);
    throw error;
  }
}

// Get user permissions (from role + individual permissions)
export async function getUserPermissions(userId: string) {
  try {
    // Get user with role relationship
    const user = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId,
    );


    let permissions: any[] = [];

    // Get role permissions if user has a role
    if (user.role) {
      try {
        const rolePermissions = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.rolePermissions,
          [Query.equal('role', user.role), Query.limit(40)]
        );

        
        // Get permission details for each role permission
        const rolePermissionDetails = await Promise.all(
            rolePermissions.documents.map(async (rp: any) => {
            try {
              return await databases.getDocument(
                appwriteConfig.database,
                appwriteConfig.permissions,
                rp.permission
              );
            } catch (error) {
              console.error('Error fetching permission:', error);
              return null;
            }
          })
        );

        permissions = [...permissions, ...rolePermissionDetails.filter(p => p !== null)];
      } catch (error) {
        console.error('Error fetching role permissions:', error);
      }
    }

    // Get individual user permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      const userPermissionDetails = user.permissions.map((permission: any) => {
        return permission.$id ? permission : null;
      }).filter((p: any) => p !== null);

      permissions = [...permissions, ...userPermissionDetails];
    }

    // Remove duplicates
    const uniquePermissions = permissions.filter((permission, index, self) =>
      index === self.findIndex(p => p.$id === permission.$id)
    );

    return uniquePermissions;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}
