import { Query } from "appwrite";

import {
  account,
  databases,
  tablesDB
} from "../appwrite.config";
import { parseStringify } from "../utils";
import { appwriteConfig } from './../appwrite.config';


// CREATE APPWRITE USER
export const signInAccount = async (user: { username: string; password: string }) => {
    const email = `${user.username}@eds.com`
  try {
    console.log(email, user.password)
    const session = await account.createEmailPasswordSession(email, user.password);
    console.log(session);
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

    const currentUser = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.users,
      [Query.equal('accountId', currentAccount.$id), Query.select(['*', 'role.*'])] // Fetch role details
    );
    // console.log(currentUser.documents[0].courses);

    if (!currentUser) throw Error;

    return currentUser.rows[0];
  } catch (error) {
    // console.log(error);
    return null;
  }
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