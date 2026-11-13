import { Query } from "appwrite";

import {
  account,
  databases,
  tablesDB
} from "../appwrite.config";
import { parseStringify } from "../utils";
import { appwriteConfig } from './../appwrite.config';
import { portalGetProfile } from './portal.actions';
import { getPortalToken } from '../portalClient';
import { COMPANY_LABEL, COMPANY_ROLE } from '@/utils/companyAccess';


// CREATE APPWRITE USER
export const signInAccount = async (user: { username: string; password: string }) => {
    const email = `${user.username}@eds.com`
  try {
    const session = await account.createEmailPasswordSession(email, user.password);
    return parseStringify(session);
  } catch (error: any) {
    // Check existing user
    if (error && error?.code === 409) {
      return error;
    }
    // console.error("An error occurred while signing in:", error);
  }
};




// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    // console.log(error);
  }
}

// ============================== GET USER
export async function getCurrentUser(): Promise<any> {
  try {
    const currentAccount = await getAccount();
    // console.log(currentAccount);

    if (!currentAccount) throw Error;

    // A company login cannot read the database itself (see utils/companyAccess);
    // its own record comes from the server instead.
    if (currentAccount.labels?.includes(COMPANY_LABEL)) return await getCompanyProfile();

    try {
      const currentUser = await tablesDB.listRows(
        appwriteConfig.database,
        appwriteConfig.users,
        [Query.equal('accountId', currentAccount.$id), Query.select(['*', 'role.*'])] // Fetch role details
      );

      if (currentUser?.rows?.[0]) return currentUser.rows[0];
    } catch {
      // fall through: may be a company login whose label has not reached this session yet
    }

    return await getCompanyProfile();
  } catch (error) {
    // console.log(error);
    return null;
  }
}


// The signed-in company login, shaped like a user row so the rest of the app can read it
async function getCompanyProfile(): Promise<any> {
  const profile = await portalGetProfile(await getPortalToken());

  return {
    ...profile,
    status: 'active',
    role: { name: COMPANY_ROLE, displayName: profile.companyName }
  };
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET ALL USERS
export async function getAllUsers(roleFilter?: string): Promise<any[]> {
  try {
    const queries = [Query.select(['*', 'role.*']), Query.limit(400)];
    
    if (roleFilter) {
      queries.push(Query.equal('role.name', roleFilter));
    }

    const users = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.users,
      queries
    );

    return users.rows || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}