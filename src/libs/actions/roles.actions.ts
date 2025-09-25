import { ID, Query } from "appwrite";
import { databases } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';

export async function createRole(roleData: {
  name: string;
  displayName: string;
  description: string;
  permissionIds: string[];
}) {
  try {
    // Create role
    const role = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.roles,
      ID.unique(),
      {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        isActive: true
      }
    );

    // Create role-permission relationships
    if (roleData.permissionIds.length > 0) {
      await Promise.all(
        roleData.permissionIds.map(permissionId =>
          databases.createDocument(
            appwriteConfig.database,
            appwriteConfig.rolePermissions,
            ID.unique(),
            {
              role: role.$id,
              permission: permissionId
            }
          )
        )
      );
    }

    return role;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
}

export async function getRolesList() {
  try {
    const roles = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.roles,
      [Query.orderAsc('displayName')]
    );

    return roles;
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
}

export async function getRoleWithPermissions(roleId: string) {
  try {
    const role = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.roles,
      roleId  
    );

    // Get role permissions
    const rolePermissions = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.rolePermissions,
      [Query.equal('role', roleId)]
    );

    // Get permission details
    const permissions = await Promise.all(
      rolePermissions.documents.map(rp =>
        databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.permissions,
          rp.permission
        )
      )
    );

    return { ...role, permissions };
  } catch (error) {
    console.error('Error fetching role with permissions:', error);
    throw error;
  }
}

export async function updateRole(roleId: string, roleData: {
  displayName?: string;
  description?: string;
  permissionIds?: string[];
}) {
  console.log('Updating role:', roleId, 'with data:', roleData); // Debugging line
  try {
    // Update role basic info only if provided
    const updateData: any = {};
    if (roleData.displayName !== undefined) updateData.displayName = roleData.displayName;
    if (roleData.description !== undefined) updateData.description = roleData.description;

    let role;
    if (Object.keys(updateData).length > 0) {
      role = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.roles,
        roleId,
        updateData
      );
    } else {
      // Just get the existing role
      role = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.roles,
        roleId
      );
    }

    // Update permissions if provided
    if (roleData.permissionIds !== undefined) {
      try {
        // Delete existing role permissions - use the correct collection name
        const existingPermissions = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.rolePermissions, // Make sure this matches your actual collection name
          [Query.equal('role', roleId)]
        );

        console.log('Existing permissions to delete:', existingPermissions.documents); // Debug log

        // Delete existing permissions one by one with error handling
        for (const rp of existingPermissions.documents) {
          try {
            await databases.deleteDocument(
              appwriteConfig.database,
              appwriteConfig.rolePermissions,
              rp.$id
            );
            console.log('Deleted permission:', rp.$id); // Debug log
          } catch (deleteError) {
            console.error('Error deleting permission:', rp.$id, deleteError);
            // Continue with other deletions even if one fails
          }
        }

        // Create new role permissions
        if (roleData.permissionIds.length > 0) {
          for (const permissionId of roleData.permissionIds) {
            try {
              await databases.createDocument(
                appwriteConfig.database,
                appwriteConfig.rolePermissions,
                ID.unique(),
                {
                  role: roleId,
                  permission: permissionId
                }
              );
              console.log('Created permission relationship:', permissionId); // Debug log
            } catch (createError) {
              console.error('Error creating permission relationship:', permissionId, createError);
            }
          }
        }
      } catch (permissionError) {
        console.error('Error managing role permissions:', permissionError);
        throw permissionError;
      }
    }

    return role;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
}
