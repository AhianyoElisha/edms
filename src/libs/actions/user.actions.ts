'use server'

import { databases, account, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { Users } from "@/types/apps/ecommerceTypes";
import { Client, Databases, Users as UsersAPI, Query, ID } from 'node-appwrite';
import { emailKey, personNameKey, phoneKey } from '@/utils/fleetIdentity';
import { withTextCase } from '../textCaseGuard';
import { toNameCase } from '@/utils/textCase';

// Initialize server-side Appwrite client with API key
const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.APPWRITE_API_KEY!);

const serverDatabases = withTextCase(new Databases(serverClient));
const usersAPI = new UsersAPI(serverClient);

export type SimilarUser = {
  $id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  matchedOn: Array<'name' | 'phone' | 'email'>;
};

/**
 * Active users who look like the person about to be added: same name (in any
 * word order or letter case), same phone number, or same email.
 */
export async function findSimilarUsers(candidate: { name: string; phone: string; email: string }): Promise<SimilarUser[]> {
  const name = personNameKey(candidate.name);
  const phone = phoneKey(candidate.phone);
  const email = emailKey(candidate.email);
  const matches: SimilarUser[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await serverDatabases.listDocuments(appwriteConfig.database, appwriteConfig.users, [
      Query.notEqual('status', 'deleted'),
      Query.select(['$id', 'name', 'phone', 'email', 'role.name', 'role.displayName']),
      Query.limit(500),
      ...(cursor ? [Query.cursorAfter(cursor)] : [])
    ]);

    for (const user of page.documents as any[]) {
      const matchedOn: SimilarUser['matchedOn'] = [];

      if (name && personNameKey(user.name) === name) matchedOn.push('name');
      if (phone && phoneKey(user.phone) === phone) matchedOn.push('phone');
      if (email && emailKey(user.email) === email) matchedOn.push('email');

      if (matchedOn.length) {
        matches.push({
          $id: user.$id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role?.displayName || user.role?.name || '',
          matchedOn
        });
      }
    }

    if (page.documents.length < 500) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return matches;
}

/**
 * Create user account using server-side SDK with admin privileges
 * This is the recommended way for admins to create users
 *
 * Refuses to create a second record for someone who is already in the system
 * and returns the look-alikes instead (`duplicates`). A match on name and phone,
 * or on email, is never allowed. A match on only the name or only the phone can
 * be two different people, so the caller may retry with `allowSimilar`.
 */
export async function createUserAccount(
  userData: {
    name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    role: string;
    avatar: string;
  },
  options: { allowSimilar?: boolean } = {}
): Promise<{ success: true; user: any } | { success: false; duplicates: SimilarUser[]; canOverride: boolean }> {
  const similar = await findSimilarUsers(userData);
  const certain = similar.filter(
    u => u.matchedOn.includes('email') || (u.matchedOn.includes('name') && u.matchedOn.includes('phone'))
  );

  if (certain.length) return { success: false, duplicates: certain, canOverride: false };
  if (similar.length && !options.allowSimilar) return { success: false, duplicates: similar, canOverride: true };

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
      toNameCase(userData.name)
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
    return { success: true as const, user };
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

/**
 * Delete (deactivate) a user.
 *
 * NOTE: This is a SOFT delete. Hard-deleting the user document via the Appwrite
 * API currently fails with a 500 (`general_unknown`) — the users collection has
 * an internal delete-path corruption in Appwrite that no client change can work
 * around (verified: the same delete call succeeds on other collections, and
 * every delete against `users` fails regardless of the document's contents).
 * Until the collection is repaired/migrated server-side, we mark the user as
 * `deleted` and remove their auth account so they vanish from the app and can
 * no longer log in. Soft-deleted users are filtered out of getUserList().
 */
export async function deleteUser(userId: string) {
  try {
    console.log('=== Deleting (soft) User ===');
    console.log('User document ID:', userId);

    // Fetch the user document first so we know which auth account to remove
    const user = await serverDatabases.getDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId
    );

    // Mark the document as deleted (hides it from the list + stats).
    await serverDatabases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId,
      { status: 'deleted' }
    );

    console.log('User marked as deleted:', userId);

    // A removed driver must not stay as the assigned driver of a vehicle
    // (best-effort - the user is already deactivated at this point).
    try {
      const vehicles = await serverDatabases.listDocuments(appwriteConfig.database, appwriteConfig.vehicles, [
        Query.equal('driver', userId),
        Query.select(['$id']),
        Query.limit(100)
      ]);

      for (const vehicle of vehicles.documents) {
        await serverDatabases.updateDocument(appwriteConfig.database, appwriteConfig.vehicles, vehicle.$id, { driver: null });
      }
    } catch (vehicleError: any) {
      console.error('Failed to unassign vehicles (continuing):', vehicleError?.message);
    }

    // Remove the underlying auth account so the user can no longer sign in
    // (best-effort — a missing account shouldn't fail the whole operation).
    if (user.accountId) {
      try {
        await usersAPI.delete(user.accountId);
        console.log('Auth account deleted successfully:', user.accountId);
      } catch (accountError: any) {
        console.error('Failed to delete auth account (continuing):', accountError?.message);
      }
    }

    return { success: true, message: 'User deleted successfully' };
  } catch (error: any) {
    console.error('=== Error Deleting User ===');
    console.error('Error details:', error);
    throw new Error(error?.message || 'Failed to delete user');
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
