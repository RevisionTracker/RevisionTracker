# GCSE Revision Tracker v2 — iPhone-friendly PWA

This is a mobile-first Progressive Web App for revision scheduling. It can be hosted on GitHub Pages and added to an iPhone Home Screen from Safari. After its app files are cached, the basic planner works offline; the computer does not need to stay on.

## Included in v2

- Dated weekly navigation, GCSE subjects (including separate English Language and English Literature), revision slots, completion state, notes and minutes.
- Per-session reminder offsets (none, 5, 10, 15 or 30 minutes) included in Apple Calendar exports.
- Optional experimental on-device AI using WebLLM and a small SmolLM2 model. It requires a supported WebGPU browser, internet for the first download (several hundred MB), adequate free memory, and is not guaranteed to run on every iPhone. The prompt is processed in-browser; if the model fails, use the ChatGPT copy/paste workflow.
- AI planning prompt generation and validated JSON import using ordinary ChatGPT access without a separate API fee.
- JSON backup/import.
- Optional Supabase authentication and per-account cloud sync, plus a scheduled Web Push notification backend. These cloud features are disabled until the project owner configures Supabase.
- Service worker support for displaying server-sent push notifications.

## Important notification limits

The app cannot reliably run JavaScript timers after iOS has closed it. Apple Calendar reminders are the simplest option and work independently of this app: in **Data & reminders**, export the selected week's `.ics` file, open it on the iPhone, add the events to Calendar, and make sure Calendar alerts are enabled. Re-export after changing the week's schedule.

Push notifications can also work for iPhone Home Screen web apps on iOS/iPadOS 16.4 or later, but they require a server that sends Web Push. The included Supabase Edge Function and SQL are a starting implementation for that server. Do not expect push reminders until the Supabase setup below is complete, the user has signed in, has enabled notifications, and the app has synced their plan to the cloud. Apple describes the Home Screen and server-side Web Push requirements here: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers

## Publish or update on GitHub Pages

1. Extract the ZIP.
2. Upload **the contents of the `RevisionTracker_iPhone` folder** into the root of your GitHub Pages repository. `index.html` should be at the repository root. Include `app.js`, `styles.css`, `manifest.webmanifest`, `service-worker.js`, all icons and `supabase-config.js`.
3. Keep `supabase-config.js` with its configuration values blank until you create your own Supabase project. The blank config keeps account features disabled but local planning still works.
4. Commit the changes. GitHub Pages should update the same website address. On the iPhone, close the installed web app fully and reopen it online so the v2 service worker cache installs.

## Basic use and backups

The local planner data is stored in browser storage on the current device. Use **Data & reminders → Export backup** regularly. Clearing Safari website data may erase the local copy. Cloud-sync data is a separate copy in your authenticated account once configured.

## Optional: configure accounts and cloud sync for friends

Each person should create their own account; one user's saved plan is not shared with other users. The public site source is visible on GitHub Pages, but revision data should not be stored in the GitHub repository.

1. Create a Supabase project.
2. In Supabase **SQL Editor**, run `supabase/setup.sql`. It creates the per-user `revision_data` table, push subscription table, send-log table, and row-level security (RLS) policies. The policies make each account read/write only its own records.
3. In Project Settings / API, copy the Project URL and publishable (or legacy anon) key. Put them in `supabase-config.js`:

   ```js
   window.REVISION_APP_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
     supabasePublishableKey: "YOUR_PUBLISHABLE_OR_ANON_KEY",
     vapidPublicKey: ""
   };
   ```

   A publishable/anon key is intended for browser use when RLS is configured correctly. **Never put a service-role/secret key into `supabase-config.js` or GitHub.**
4. In Supabase Authentication URL settings, add your published GitHub Pages URL to the allowed site/redirect URLs so confirmation links return to the app.
5. Re-upload `supabase-config.js` to GitHub Pages. Users can then open **Account & sync** and create their own account. Confirm email if Supabase asks. Signing in syncs that account between their devices when online.
6. For your own already-saved guest data, sign in and deliberately choose **Copy this device's data to my account**. Do this only for your own data. This action replaces the currently signed-in account's stored copy with the local guest profile.

Do not share your password with friends. Give them the website URL and ask each friend to create their own account. If you ever make the project public, remember anyone can inspect website source code; never commit personal revision records or secret keys.

## Optional: configure genuine push reminders

Calendar export works without this setup. Push reminders require a Supabase project, a server-side Edge Function, a public/private VAPID key pair, and a scheduled call to the function.

1. Confirm the database tables from `supabase/setup.sql` exist.
2. Generate a VAPID key pair on your PC using Node.js/npm, for example `npx web-push generate-vapid-keys`. Keep the private key secret. Put the **public** key only in `supabase-config.js` as `vapidPublicKey`.
3. Deploy the function using the Supabase CLI from the extracted project folder. Sign in with `npx supabase login`, link the project using `npx supabase link --project-ref YOUR_PROJECT_REF`, then deploy with `npx supabase functions deploy revision-push`.
4. Set these Edge Function secrets in Supabase (Dashboard → Edge Functions → Secrets, or the CLI):
   - `VAPID_PUBLIC_KEY` = VAPID public key
   - `VAPID_PRIVATE_KEY` = VAPID private key (server secret only)
   - `VAPID_SUBJECT` = a contact URI such as `mailto:your-own-contact@example.com` (replace with your real contact)
   - `CRON_SECRET` = a long random secret you choose
   - `APP_URL` = the full published website URL, including repository path, e.g. `https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY/`

   The platform injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the function. If you use the CLI, keep secrets out of your local repository and shell history where possible.
5. In Supabase Database → Extensions, enable `pg_cron`, `pg_net` and Vault if they are available to your project.
6. Open `supabase/schedule_push.sql.example`, replace `PROJECT_REF` and `REPLACE_WITH_THE_SAME_LONG_RANDOM_CRON_SECRET`, then execute the SQL in the Supabase SQL Editor. The secret entered in Vault must match the function's `CRON_SECRET` secret exactly. This schedules the function once a minute.
7. Publish the updated `supabase-config.js` on GitHub Pages. On iPhone, open the site in Safari, choose **Share → Add to Home Screen**, launch it from its Home Screen icon, sign in, then use **Data & reminders → Enable push notifications** and allow notifications.
8. Create a future test session with a reminder, ensure the app has synced after sign-in, and test it. The server checks cloud-synced sessions on a minute schedule, so allow a few minutes for a reminder to arrive. Export to Apple Calendar as a fallback.

The private VAPID key, Cron secret and Supabase service-role key must never appear in the public website files. Anyone who sees those secrets could misuse the backend. If they are exposed, rotate them immediately.

## AI notes

The no-API-cost ChatGPT workflow sends only the planning prompt you copy into your ChatGPT conversation. The optional on-device model downloads its runtime/model resources from external hosting on first use but generates its response inside the browser. It needs WebGPU and memory; a failed model load does not affect the regular tracker. Do not expect a tiny local model to be as accurate as a larger cloud model: inspect its timetable before importing.

## Troubleshooting

- **App looks unchanged:** close it fully, open the web address online, and wait for the `revision-tracker-v2` cache to update. You may need to remove and re-add the Home Screen app if iOS refuses to update it.
- **Account tab says unconfigured:** check `supabase-config.js` has the project URL and publishable/anon key, and verify the CDN script loaded while online.
- **Cloud sync fails:** confirm `setup.sql` was executed and all RLS policies exist. Never fix this by disabling RLS or putting a service-role key in the browser.
- **Push notifications fail:** verify Home Screen installation, iOS 16.4+, notification permission, VAPID values, Edge Function secrets, Cron schedule, app URL, and that the user's data has synced online.
- **Local AI crashes or reports no WebGPU:** use the ChatGPT copy/paste workflow. Local model support varies by browser/device and can consume substantial memory.
