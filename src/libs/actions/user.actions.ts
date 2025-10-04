'use server'

import { databases, account, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { Users } from "@/types/apps/ecommerceTypes";
import { Client, Databases, Users as UsersAPI, Query, ID } from 'node-appwrite';

// Initialize server-side Appwrite client with API key
const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.APPWRITE_API_KEY!);

const serverDatabases = new Databases(serverClient);
const usersAPI = new UsersAPI(serverClient);

/**
 * Create user account using server-side SDK with admin privileges
 * This is the recommended way for admins to create users
 */
export async function createUserAccount(userData: {
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  avatar: string;
}) {
  try {
    // Create account with @eds.com email for authentication
    const authEmail = `${userData.username}@eds.com`;
    
    console.log('=== Creating User Account (Server-side) ===');
    console.log('Payload being sent:', {
      name: userData.name,
      username: userData.username,
      authEmail: authEmail,
      personalEmail: userData.email,
      phone: userData.phone,
      role: userData.role,
      avatar: userData.avatar
    });
    
    // Create auth account using Users API (admin SDK)
    const newAccount = await usersAPI.create(
      ID.unique(),
      authEmail,
      undefined, // phone (optional)
      userData.password,
      userData.name
    );

    console.log('Auth account created successfully:', {
      accountId: newAccount.$id,
      email: newAccount.email
    });

    // Create user document with personal email stored
    const user = await serverDatabases.createDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      ID.unique(),
      {
        name: userData.name,
        accountId: newAccount.$id,
        email: userData.email, // Store personal email (e.g., esthersoglo@gmail.com)
        role: userData.role,
        phone: userData.phone,
        avatar: userData.avatar,
        status: 'active'
      }
    );

    console.log('User document created successfully:', user.$id);
    return { success: true, user };
  } catch (error: any) {
    console.error('=== Error Creating User ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    
    // Throw more specific error messages
    if (error.message?.includes('email') || error.type === 'user_email_already_exists') {
      throw new Error(`A user with the email ${userData.username}@eds.com already exists. Please use a different username.`);
    } else if (error.message?.includes('phone') || error.type === 'user_phone_already_exists') {
      throw new Error(`A user with the phone number ${userData.phone} already exists. Please use a different phone number.`);
    } else {
      throw error;
    }
  }
}

/**
 * Get user sessions (logged-in devices) using accountId
 */
export async function getUserSessions(accountId: string) {
  try {
    console.log('=== Fetching User Sessions ===');
    console.log('Account ID:', accountId);

    // Get all sessions for the user
    const sessions = await usersAPI.listSessions(accountId);
    
    console.log('Sessions fetched successfully:', sessions.total);
    
    return {
      success: true,
      sessions: sessions.sessions,
      total: sessions.total
    };
  } catch (error: any) {
    console.error('=== Error Fetching Sessions ===');
    console.error('Error details:', error);
    throw new Error('Failed to fetch user sessions');
  }
}

/**
 * Get user preferences and account details using accountId
 */
export async function getUserAccountDetails(accountId: string) {
  try {
    console.log('=== Fetching User Account Details ===');
    console.log('Account ID:', accountId);

    // Get user account details
    const accountDetails = await usersAPI.get(accountId);
    
    console.log('Account details fetched successfully');
    
    return {
      success: true,
      account: accountDetails
    };
  } catch (error: any) {
    console.error('=== Error Fetching Account Details ===');
    console.error('Error details:', error);
    throw new Error('Failed to fetch account details');
  }
}

/**
 * Delete a specific session (logout from a device)
 */
export async function deleteUserSession(accountId: string, sessionId: string) {
  try {
    console.log('=== Deleting User Session ===');
    console.log('Account ID:', accountId, 'Session ID:', sessionId);

    await usersAPI.deleteSession(accountId, sessionId);
    
    console.log('Session deleted successfully');
    
    return {
      success: true,
      message: 'Device logged out successfully'
    };
  } catch (error: any) {
    console.error('=== Error Deleting Session ===');
    console.error('Error details:', error);
    throw new Error('Failed to logout device');
  }
}

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
