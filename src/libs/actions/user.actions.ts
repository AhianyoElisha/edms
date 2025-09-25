import { ID, Query } from "appwrite";
import { databases, account, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { Users } from "@/types/apps/ecommerceTypes";

export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  avatar: string;
}) {
  try {
    // Create account with unique email combination
    const username = userData.email.split('@')[0];
    const accountEmail = `${username}@desertlion.com`;
    
    const createdAccount = await account.create(
      ID.unique(),
      accountEmail,
      userData.password,
      userData.name
    );

    // Create user document
    const user = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      ID.unique(),
      {
        name: userData.name,
        accountId: createdAccount.$id,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        avatar: userData.avatar,
        status: 'active'
      }
    );

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(userId: string, userData: {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  status?: string;
}) {
  try {
    const updatedUser = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId,
      userData
    );

    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function getUserById(userId: string) {
  try {
    const user = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.users,
      userId,
      [Query.select(['*', 'role.*'])]
    );

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function getUserList() {
  try {
    const users = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.users,
      [Query.orderDesc('$createdAt'), Query.limit(100)]
    );

    // Fetch roles for each user
    const usersWithRoles = await Promise.all(
      users.documents.map(async (user) => {
        if (user.role) {
          try {
            const role = await databases.getDocument(
              appwriteConfig.database,
              appwriteConfig.roles,
              user.role
            );
            return { ...user, role };
          } catch (error) {
            return user;
          }
        }
        return user;
      })
    );

    return { ...users, documents: usersWithRoles };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    // Get user to find accountId
    const user = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId
    );

    // Update password using account ID
    await account.updatePassword(newPassword);

    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

export async function updateLoginDevice(userId: string, deviceInfo: any) {
  try {
    const user = await getUserById(userId);
    const loginDevices = user.loginDevices ? JSON.parse(user.loginDevices) : [];
    
    // Add new device or update existing
    const deviceIndex = loginDevices.findIndex((device: any) => 
      device.browser === deviceInfo.browser && device.device === deviceInfo.device
    );
    
    if (deviceIndex >= 0) {
      loginDevices[deviceIndex] = { ...deviceInfo, lastAccess: new Date().toISOString() };
    } else {
      loginDevices.push({ ...deviceInfo, lastAccess: new Date().toISOString() });
    }

    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId,
      {
        loginDevices: JSON.stringify(loginDevices.slice(-5)), // Keep last 5 devices
        lastLoginAt: new Date().toISOString()
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating login device:', error);
    throw error;
  }
}
