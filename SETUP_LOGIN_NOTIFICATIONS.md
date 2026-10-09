# Revision Tracker v4 — setup, username accounts, backups and notifications

This guide separates the setup into stages. **Get account sync working before configuring push notifications.** Do not try to debug both at once.

## 0. First: update the GitHub Pages website safely

1. Open the current app on the iPhone and use **Data & reminders → Export backup**.
2. Extract this ZIP on your PC.
3. Upload the **contents** of the extracted `RevisionTracker_iPhone_v4` folder to the root of your existing GitHub Pages repository. `index.html` must remain at the root. Include the `supabase` folder too.
4. Commit the upload and wait for GitHub Pages to publish.
5. Close the Home Screen app fully, open the website in Safari while online, then reopen the Home Screen app. The v4 service-worker cache name forces the app files to refresh.
6. Check that your previous records are still present before doing anything else.

## 1. AI: use the method that gives good results

The button called **Experimental local AI** runs a tiny 360-million-parameter model in the browser. It can be poor at making coherent schedules and valid JSON, and iPhone browser GPU support varies. This is a model limitation, not a setting you can fix. It may also need a large first download.

The recommended free workflow is **AI planner → fill out the three context boxes → Create planning prompt → Copy prompt → open ChatGPT → paste and send → copy only the JSON response → paste it into the import box → Validate and import sessions**. This uses your normal ChatGPT access and does not use the paid API. Free ChatGPT usage limits still apply.

The v4 prompt includes recent history, minutes by subject, completed sessions and revision notes, asks for specific tasks, and requests only new sessions. Before import, the app checks the JSON fields and rejects time overlaps with existing or other proposed sessions. Still inspect the timetable before accepting it: AI can make mistakes.

A genuinely embedded, higher-quality cloud AI needs a provider account/API and may have charges or a limited free tier. The app cannot silently use a ChatGPT subscription as an API.

## 2. Set up username-based accounts, subject profiles and automatic backups

Supabase hosts the authentication/database service. The website remains public, but each user's revision records are private to that account through row-level security.

### A. Create the project and database tables

1. Create a Supabase project in the Supabase dashboard. If the service account setup has age/consent requirements, ask a parent or guardian to help.
2. Open **SQL Editor → New query**.
3. Open `supabase/setup.sql` from this download, copy its entire contents into the query editor, then run it.
4. Confirm that the tables `revision_data`, `revision_data_backups`, `push_subscriptions`, and `push_sent_reminders` exist. Do not disable row-level security. The script also installs a trigger that captures previous cloud data versions and retains the latest 50 snapshots for each account.

### B. Configure the public website key

1. In the Supabase project, open **Project Settings / API Keys** (or the Connect panel) and copy the **Project URL** plus the **publishable key**. A legacy `anon` key can also be used.
2. Edit `supabase-config.js` in the downloaded folder to look like this, substituting your values:

```js
window.REVISION_APP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  vapidPublicKey: ""
};
```

3. Upload the edited `supabase-config.js` to the root of the GitHub repository and commit it.

**Never paste a Supabase secret/service-role key into this file.** Only the publishable/anon key belongs in browser code; row-level security is what keeps account records separated.

### C. Configure username/password accounts without collecting emails

The app does **not** ask people for an email address. Supabase's standard password auth is email/phone based rather than native username auth, so this app converts each username (lowercased) into an internal placeholder identity ending in `.invalid`. This keeps password hashing and session management inside Supabase Auth; the app never stores raw passwords itself. The placeholder is not a real mailbox and must not receive any email.

1. In Supabase, open **Authentication → Sign In / Providers → Email** (dashboard wording can vary).
2. Make sure new sign-ups are allowed and the **Email provider is enabled**.
3. Turn **Confirm email OFF**. This is essential: no user has a real email address to confirm. If confirmation is left on, sign-ups will be pending and no email can be received.
4. In **Authentication → URL Configuration**, set the Site URL to the exact GitHub Pages address, including the repository path, for example `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. Add the same address to Redirect URLs too.

No real email address is sent or collected by the app. However, account recovery by email is therefore not available. If a user forgets their password, they cannot reset it with a confirmation link. Users should choose a strong unique password, let iPhone Passwords save it, and keep personal data backups.

### D. Test account creation, sign-in and sync

1. Open the app on your iPhone. Go to **Account & sync**.
2. Tap **New here? Create account** before focusing the password field. Use a unique username containing 3–24 letters, numbers, underscores or hyphens, and a password of at least 8 characters.
3. iPhone Passwords may offer to suggest/save a password. Safari/iOS ultimately controls that prompt; the input fields use `username` and `new-password`/`current-password` autocomplete attributes.
4. Add a custom subject or deselect subjects under **My subjects**, then tap **Save my subjects**. Tap **Sync now** and confirm the status reports success.
5. Create a revision session, sync again, then use a second device to sign into the same username and check that subject choices and revision sessions appear.
6. To test friends, sign out and let each friend create a separate account with their own username and password. Never share passwords or use the same account between people.

### E. Test automatic backups and restore

1. While signed in, make a small change to a subject selection or revision session and wait for cloud sync to complete.
2. Make a second different change and sync again.
3. Go to **Account & sync → Automatic account backups → Load backup history**. You should see the previous cloud snapshots.
4. If testing restore, export a manual JSON backup first. Choose a snapshot and tap **Restore selected backup**. The currently stored cloud data will itself be backed up before the selected snapshot becomes current.

The database trigger only sees cloud-synced data changes. Local guest data that has not been synced is not included in automatic account backups. Keep using **Data & reminders → Export backup** as an independent backup.

### If login still says unconfigured

- Confirm `supabase-config.js` is in the repository root beside `index.html`, not inside the `supabase` folder.
- Check that the Project URL starts with `https://` and ends with `.supabase.co`.
- Check that the key is a **publishable/anon key**, not a secret/service-role key.
- In Supabase Auth, make sure sign-ups are allowed and **Confirm email is OFF**.
- Open the website in Safari online. Close and reopen the Home Screen app so the updated config is fetched.
- In Supabase SQL Editor, verify the updated `setup.sql` ran successfully and `revision_data` has row-level security enabled.
- If an error is shown, copy the exact error text (not your key or password) so it can be diagnosed.

## 3. Push notifications on iPhone

Push is **not** the same as Calendar export. The app cannot keep running a JavaScript timer after iOS closes it. A server must send web push at the correct time. For iPhone web push, use iOS/iPadOS 16.4 or later and launch the website from its Home Screen icon; Apple documents the requirements at https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers.

Keep using **Export this week's calendar (.ics)** as the reliable fallback while setting this up.

### A. Create VAPID keys on the PC

This step uses Node.js/npm on your computer. It does not mean the computer must stay on after the backend is deployed.

1. Install Node.js if it is not installed.
2. Open PowerShell in a folder where you can run commands and execute:

```powershell
npx web-push generate-vapid-keys
```

3. Save the **Public Key** and **Private Key** somewhere safe. The public key is used by the website; the private key must stay server-side. Do not post either key in chat or commit the private key to GitHub.

### B. Configure the website's public key

Edit `supabase-config.js` and set `vapidPublicKey` to the generated **public** key. Keep the Project URL and publishable/anon key too. Upload the edited file to GitHub Pages and commit it.

### C. Deploy the notification sender

1. Install the Supabase CLI following the official instructions: https://supabase.com/docs/guides/cli.
2. Open a terminal in the extracted `RevisionTracker_iPhone_v4` folder (the folder that contains `supabase`). Run:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy revision-push
```

3. In the Supabase dashboard, open **Edge Functions → Secrets** and add:
   - `VAPID_PUBLIC_KEY` = the VAPID public key
   - `VAPID_PRIVATE_KEY` = the VAPID private key
   - `VAPID_SUBJECT` = your HTTPS app URL, such as `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`
   - `CRON_SECRET` = a new long, random secret you choose
   - `APP_URL` = your exact GitHub Pages address, including repository path and trailing slash

Supabase injects its own `SUPABASE_URL` and service-role credentials into the Edge Function environment. Do not add server secrets to the website. Never share `CRON_SECRET`, `VAPID_PRIVATE_KEY`, or any Supabase secret/service-role key with anyone.

### D. Enable the scheduler

1. In Supabase **Database → Extensions**, enable `pg_cron`, `pg_net`, and Vault (`supabase_vault`/Vault, depending on dashboard wording) if available.
2. Open `supabase/schedule_push.sql.example` from this download.
3. Replace `PROJECT_REF` with your project reference and replace `REPLACE_WITH_THE_SAME_LONG_RANDOM_CRON_SECRET` with the exact same value used for `CRON_SECRET` in Edge Function Secrets.
4. Run that SQL in Supabase SQL Editor **once**. It stores the cron secret in Vault and schedules the sender to check every minute. If you already ran it, do not run it again unchanged; duplicate secret names or scheduler names may cause errors.
5. Check the Supabase Edge Function logs and the database cron job status if the SQL reports an error.

### E. Subscribe and test

1. Open the published site in Safari and use **Share → Add to Home Screen** if it is not already installed.
2. Open the Home Screen app (not just a Safari tab), sign in, and tap **Sync now**.
3. Go to **Data & reminders → Enable push notifications** and allow the iOS permission request.
4. Create a future session with a reminder set to 5 or 10 minutes. Sync again. Wait through its reminder time and check the Edge Function logs if it does not arrive.

If the button says the setup is incomplete, check that `vapidPublicKey` is in the deployed `supabase-config.js`, the VAPID secrets are saved server-side, and the Edge Function is deployed. If it says notifications are unsupported, check the iOS version and that the app is opened from the Home Screen icon.

### Free-service caveat

Supabase Free projects can be paused after roughly seven days with too little database activity. A paused project cannot sync or send push notifications until resumed. See https://supabase.com/docs/guides/platform/free-project-pausing. Calendar alerts do not depend on Supabase or the computer being on.

## 4. Security and troubleshooting

- Each friend should create their own account. Row-level security prevents friends from reading one another's `revision_data` or `revision_data_backups` rows.
- Never disable RLS as a workaround for a sync error.
- Never commit private VAPID keys, cron secrets, secret/service-role keys, passwords or personal revision data to GitHub.
- Use **Export backup** before replacing files or restoring a cloud snapshot. Keep in mind that no-email accounts cannot use an email password reset.
- If sign-up does not create a session, check that **Confirm email is OFF**. Username-only account creation has no real email to confirm.
- If accounts work but push does not, test account sync first, then the VAPID subscription, then the scheduler/Edge Function logs—in that order.
