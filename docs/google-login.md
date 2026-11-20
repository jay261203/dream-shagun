# Google sign-in: setup

The family signs in with Google (PROJECT.md rule 4: guests never sign in). The code is built and tested up to the moment the browser reaches Google. What is missing is a Google "OAuth client", which only you can create because it belongs to your Google account.

You do this once for local development, and once more for the hosted project when you deploy.

## 1. Create the Google client (about 10 minutes)

1. Open https://console.cloud.google.com and pick or create a project (for example "Dream Shagun").
2. **APIs and services, OAuth consent screen.** Choose **External**. App name: Dream Shagun. Add your email as the support and developer contact. Under scopes you only need the basic ones: `openid`, `email`, `profile`. While the app is in "Testing", add your own Google account (and any family tester) under **Test users**, because only listed accounts can sign in until you publish the app.
3. **APIs and services, Credentials, Create credentials, OAuth client ID.** Type: **Web application**.
   - **Authorised JavaScript origins:** `http://localhost:3000`
   - **Authorised redirect URIs:** `http://127.0.0.1:54321/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**. Treat the secret like a password: never put it in git, in chat or in a screenshot.

## 2. Give the values to local Supabase

Create the file `supabase/.env` (it is ignored by git) with:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
```

Then restart the local stack so it reads them:

```bash
npx supabase stop
npx supabase start
```

`supabase/config.toml` already enables Google and reads those two names. Until they are set, clicking "Continue with Google" reaches Google and fails with "The OAuth client was not found" (the client id is still the empty placeholder). That is the sign the rest of the chain works and only the credentials are missing.

## 3. Try it

1. `cd web && npm run dev` (with `npx supabase start` and the API running).
2. Open http://localhost:3000, pick a template, type your names, **Save and continue**, **Continue with Google**.
3. You should land on **Create your wedding** with your names and date already filled in.

Use `localhost`, not your computer's network address, for this test (see "Phones" below).

## Phones

Google sends the person back to Supabase's own address. For local Supabase that address is `127.0.0.1:54321`, which on a phone means the phone itself, so Google sign-in on a phone cannot work against the local stack. Phones can still open the guest pages and "Try with your names". Real phone sign-in needs the hosted Supabase project (below), which is reachable from anywhere.

## Hosted Supabase (when you deploy)

1. In the Supabase dashboard open your project, **Authentication**, then the sign-in providers (labels change between releases) and enable **Google** with the same Client ID and secret. The dashboard shows the callback address to use, in the form `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. Add that address under **Authorised redirect URIs** on the same Google client, and your real site address under **Authorised JavaScript origins**.
3. In Supabase **Authentication, URL configuration**, set **Site URL** to your site and add your site to the **Redirect URLs** list with a wildcard, for example `https://yoursite.example/**`.
4. In Vercel set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and `NEXT_PUBLIC_SITE_URL`. The API needs `SUPABASE_URL` (it fetches the project's public signing keys from there). New hosted projects sign login tokens with a key pair, which the API verifies this way; `SUPABASE_JWT_SECRET` is only used for projects that still use a shared secret.

## What is and is not verified

- Verified in this repo with a real local login token (not Google): the token check in the API, creating a wedding as that person, the sign-out, the create-wedding screen picking up the "Try with your names" draft, and the link-name checks.
- Verified: the button takes the browser through Supabase to Google with the right return address.
- **Not verified:** Google itself returning the person to the site (needs your credentials), and Supabase's redirect allow-list at that last step. If, after signing in, you land on the home page instead of **Create your wedding**, check the **Redirect URLs** setting first.
