# Environment Variables Setup for User Creation

To enable server-side user creation with admin privileges, you need to add your Appwrite API key to your environment variables.

## Steps:

1. Go to your Appwrite Console: https://cloud.appwrite.io/console
2. Navigate to your project: **EDS (68c8989000381e194776)**
3. Go to **Settings** → **API Keys**
4. Create a new API Key with the following scopes:
   - `users.read`
   - `users.write`
   - `documents.read`
   - `documents.write`
5. Copy the API Key

## Add to Environment Variables:

Create a `.env.local` file in your project root and add:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=68c8989000381e194776
APPWRITE_API_KEY=your_api_key_here
```

**Important:** 
- The `APPWRITE_API_KEY` should NOT have the `NEXT_PUBLIC_` prefix
- This keeps it server-side only for security
- Never commit this file to git (add to .gitignore)

## Restart Development Server:

After adding the environment variables, restart your dev server:

```bash
npm run dev
```

Now user creation will work with admin privileges!
