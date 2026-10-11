# Revision Tracker: enable automatic iPhone push notifications

This bundle adds the server-side sender and scheduler for the current Revision Tracker website:

https://revisiontracker.github.io/RevisionTracker/

The current frontend already has the push subscription UI and service-worker `push` handler. This setup deploys the Supabase Edge Function that checks synced sessions and sends web push when a reminder is due. Your PC does **not** need to remain on after setup.

## Before you start

- Your Supabase `setup.sql` has already succeeded. It should have created `revision_data`, `push_subscriptions` and `push_sent_reminders`.
- Keep using the live site's current `index.html`, `app.js`, `styles.css`, `service-worker.js` and `supabase-config.js`. This bundle is backend setup; it does not replace your frontend or its subject picker.
- Keep using Apple Calendar export as a fallback while testing.
- On iPhone, push requires iOS/iPadOS 16.4 or later, the site added to the Home Screen, and notification permission granted from the Home Screen app. Safari web push requires visible notifications from the service worker.

## 1. Generate VAPID keys on Windows

Install Node.js LTS if `node --version` and `npx --version` do not work in PowerShell.

Open PowerShell and run:

```powershell
npx web-push generate-vapid-keys
```

Save the **Public Key** and **Private Key** somewhere safe. The public key goes in the public website config; the private key must stay in Supabase server secrets and must never be uploaded to GitHub or sent in chat.

Generate a separate long random scheduler secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save it privately. You will use the exact same value as `CRON_SECRET` in Supabase Edge Function Secrets and as `YOUR_CRON_SECRET` in the SQL template.

## 2. Configure the public VAPID key

In your existing GitHub repository, edit `supabase-config.js` and change **only** `vapidPublicKey` to the VAPID **Public Key**. Keep your already-working `supabaseUrl` and `supabasePublishableKey` unchanged.

The shape should remain:

```js
window.REVISION_APP_CONFIG = {
  supabaseUrl: "YOUR_EXISTING_SUPABASE_PROJECT_URL",
  supabasePublishableKey: "YOUR_EXISTING_PUBLISHABLE_KEY",
  vapidPublicKey: "YOUR_VAPID_PUBLIC_KEY"
};
```

Commit the file and wait for GitHub Pages to update.

## 3. Add server-side secrets in Supabase

Open Supabase Dashboard → your project → **Edge Functions → Secrets**. Add these entries:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | The VAPID Public Key |
| `VAPID_PRIVATE_KEY` | The VAPID Private Key; keep this secret |
| `VAPID_SUBJECT` | `https://revisiontracker.github.io/RevisionTracker/` |
| `CRON_SECRET` | The random 64-character hexadecimal secret you generated |
| `APP_URL` | `https://revisiontracker.github.io/RevisionTracker/` |

Supabase supplies `SUPABASE_URL` and its server-side secret/service-role environment automatically. The function supports the current `SUPABASE_SECRET_KEYS` JSON format and legacy `SUPABASE_SERVICE_ROLE_KEY` fallback. Do not create a browser config entry for any private/server key.

## 4. Deploy the Edge Function

Extract this bundle into a folder, for example `Downloads\RevisionTracker_Push_Setup`. In File Explorer, open that folder (the one containing the `supabase` subfolder), click the address bar, type `powershell`, and press Enter.

Run the following commands one by one:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy revision-push
```

Replace `YOUR_PROJECT_REF` with the project reference from the Supabase URL: the part between `https://` and `.supabase.co`. Example URL `https://abcxyz.supabase.co` has project ref `abcxyz`.

If the CLI asks to install `supabase`, approve the install. Sign in in the browser when prompted. When `link` asks for the database password, use the database password you chose when creating the Supabase project, not your Revision Tracker username/password.

If you cannot run these commands or Node.js is not installed, stop and tell me the exact error rather than changing random dashboard settings.

## 5. Enable extensions and schedule the sender

In Supabase Dashboard → Database → Extensions (or Integrations → Cron, depending on dashboard layout), enable `pg_cron` and `pg_net`. Ensure Supabase Vault is available; its SQL functions are under the `vault` schema.

Open `supabase/schedule_push.sql.template` from this bundle. Replace:

- `YOUR_PROJECT_REF` in the URL with your project reference.
- `YOUR_SUPABASE_PUBLISHABLE_KEY` with the same public publishable key used by the website.
- `YOUR_CRON_SECRET` with the same secret used for `CRON_SECRET` in Step 3.

Run the edited SQL once in Supabase SQL Editor. It saves the URL, publishable key, and cron secret in Vault, then schedules the Edge Function every minute. The SQL is a template and must not be run with the placeholder values.

**Only run the scheduling SQL once.** If it errors after partially creating secrets or a job, do not repeatedly rerun it. Save the error and inspect the vault/job records before retrying. The project URL, publishable key and CRON_SECRET are stored in Vault; the VAPID private key remains only in Edge Function Secrets.

## 6. Enable push on your iPhone

1. Open the live website in Safari while online.
2. If not already installed, choose Share → Add to Home Screen.
3. Open the Home Screen icon (not a regular Safari tab) and sign into your account.
4. Tap **Sync now** to ensure your sessions are in the cloud.
5. In **Data & reminders**, tap **Enable push notifications** and allow the iOS permission prompt.
6. The app should say the subscription was saved.

To test, make a session scheduled for about 10–15 minutes from now, choose a 5-minute reminder, save and Sync now. Keep the Home Screen app installed; you can close it. The server checks each minute, with a small catch-up window, so the delivery may not arrive to the exact second.

## 7. Verify scheduler and diagnose failures

Run `supabase/verify_push_setup.sql` in SQL Editor to check the required tables exist. After scheduling, run this query (uncommented in that file) to check the cron job. Also check Database → Cron / job run history and Edge Functions → `revision-push` → Logs.

Common messages:

- **“Push setup is incomplete”**: public VAPID key is missing from deployed `supabase-config.js` or one of the server secrets has not been saved.
- **“Notifications unsupported”**: use iOS/iPadOS 16.4+, install the PWA on the Home Screen, and enable from that app.
- **Subscription saved, but no notification**: verify the Edge Function deployed, the cron job is active, the synced revision slot has a reminder greater than zero, the slot is not completed, and its session is due. Check logs before changing code.
- **Function reports missing admin key**: check Edge Functions logs / injected secret-key environment. Do not place any secret key in the public website config.
- **Cron returns 401**: the `CRON_SECRET` in Vault must exactly match the one in Edge Function Secrets.

## Security and cost notes

- Never put `VAPID_PRIVATE_KEY`, `CRON_SECRET`, a Supabase secret/service-role key or your database password in GitHub, `supabase-config.js`, or chat.
- Only a Supabase publishable key belongs in public browser config, protected by correctly configured row-level security.
- The web-push scheduler runs in Supabase; your computer does not need to stay switched on.
- Supabase Free projects may pause when inactive, which stops server-side notifications until resumed. Calendar-export reminders remain the fallback.
- Each user must have their own Revision Tracker account. Never share passwords.
