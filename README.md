# GCSE Revision Tracker v4 — iPhone-friendly PWA

This is a mobile-first Progressive Web App that can be hosted on GitHub Pages and added to an iPhone Home Screen. Core planning works locally, and optional Supabase account sync lets each person keep their own profile across devices.

## What's new in v4

- **Per-account subject selection:** choose the GCSE subjects you take, add custom subjects, and save the selection with your profile. Historic entries for temporarily deselected subjects are retained.
- **Username + password accounts:** the interface asks for no email address. Because Supabase Auth's built-in password sign-in expects an email or phone identity, the app maps each valid username to an internal synthetic `.invalid` email address. No real email is collected or sent. In Supabase, sign-up must be enabled and **Confirm email must be disabled**.
- **iPhone Passwords AutoFill:** username and password fields use `autocomplete="username"`, `current-password`, and `new-password` at the right points in the sign-in/create-account flow.
- **Automatic account backup snapshots:** the updated database trigger saves the previous cloud revision data whenever a real change is made. It keeps the newest 50 snapshots per account, and the app can list and restore a snapshot. Snapshots include selected subjects because those preferences are saved in the data JSON.
- Dated weekly planner, session durations, notes and completion tracking.
- ChatGPT copy-and-paste planning workflow that doesn't use a paid API. Experimental tiny on-device AI remains available but may perform poorly.
- Apple Calendar export for reminders, plus optional web-push notifications if configured.

## Deploy the website

1. From the current live site, export a JSON backup before replacing files.
2. Extract the ZIP and upload the **contents** of this folder to the root of your GitHub Pages repository. `index.html` and `supabase-config.js` must remain at the repository root.
3. Commit the files, wait for GitHub Pages to deploy, then close and reopen the iPhone Home Screen app while online.
4. If you previously enabled the v3 service worker and old files remain cached, remove the Home Screen icon, open the updated HTTPS website in Safari, and add it to the Home Screen again.

## Configure account sync and automatic backups

1. Create a Supabase project.
2. Run the updated `supabase/setup.sql` in the Supabase SQL Editor. This creates the per-user data, push-subscription and backup tables plus a backup trigger.
3. In Supabase Auth, allow new sign-ups and turn **Confirm email off**. The user interface uses usernames, not real email addresses; if email confirmation stays on, users cannot receive the confirmation message and sign-up will not finish.
4. Copy the Supabase Project URL and publishable/legacy anon key into `supabase-config.js`. Never put a secret/service-role key or VAPID private key in public browser files.
5. Upload the edited `supabase-config.js` and commit it.
6. Test by creating a unique username, adding a subject and a revision session, tapping **Sync now**, and then signing in on a second device. Each friend should have their own account.

### Backups and recovery

Cloud snapshots are created automatically when synced revision data changes. The latest 50 snapshots are retained per account. Open **Account & sync → Automatic account backups → Load backup history** to view or restore them. Restoring a snapshot writes it as the current version, while the current cloud version is first preserved by the trigger.

Keep a separate manual JSON export too. Automatic cloud backups require a configured, active Supabase project and a successful sync. They do not protect unsynced guest/local-only changes.

### Important account limitations

- There is no email-based password reset because users do not supply an email. A forgotten password cannot be recovered through email. Use a strong, unique password and keep a manual backup of your revision data.
- Accounts created by the older v3 email-login system are separate identities. Before switching, export their data while still signed in; create a new username account and import the local backup or copy your own local data into that account. Existing cloud data is not automatically re-linked.
- Keep email/password provider enabled in Supabase even though the app asks the user only for a username. The app uses an internal placeholder identity so Supabase continues to hash passwords and manage sessions; it does not implement its own password storage.
- Supabase Free projects may pause after inactivity. If a project is paused, sync, backups, and push stop until it is resumed.

## iPhone Passwords

The account form includes a real username field, a password field, and the HTML AutoFill semantics recommended by Apple. When creating an account, choose **New here? Create account** before focusing the password field so iOS sees `new-password`. When signing in, the field uses `current-password`. Safari / iOS Passwords decides whether to offer saving or filling credentials; the website cannot force a prompt. Users can check **Settings → General → AutoFill & Passwords** if autofill is disabled.

## Push notifications

Push notifications need more setup than Calendar alerts. iPhone users must add the HTTPS site to the Home Screen and approve push permission. Deploy the included Edge Function, configure private VAPID/cron secrets in Supabase, and set up the scheduled SQL job using `SETUP_LOGIN_NOTIFICATIONS.md`. Never commit private keys or cron secrets to GitHub. Apple Calendar export remains the simpler fallback.

## Local data

When signed out, data is stored only in browser storage on that device. When signed in, local data is queued for cloud sync. Export a manual backup before major updates and periodically thereafter.
