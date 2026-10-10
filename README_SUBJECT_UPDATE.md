# Revision Tracker subject update

This is a small patch for the existing live Revision Tracker repository. It changes only `index.html`, `app.js`, and `service-worker.js`.

## Changes
- New profiles start with Maths, English Literature, and English Language selected.
- A dropdown lets users add common GCSE/school subjects, with an optional custom-subject field for subjects not listed.
- Subject selections remain profile-specific and are stored as part of the existing account data.
- Existing users whose selected subject list exactly matches the old untouched nine-subject default are migrated to the new three-subject default. Existing custom selections are preserved. Historic revision records and sessions are not deleted.
- Service worker cache version is advanced to v6 so the new files load on iPhone.

## Installation
1. Export a backup from the app first.
2. Upload these three files to the root of the existing GitHub repository, replacing the old `index.html`, `app.js`, and `service-worker.js`.
3. **Do not replace `supabase-config.js`**, as it contains the existing Supabase Project URL and publishable key.
4. Commit the changes to the same branch used by GitHub Pages.
5. After deployment, open `https://revisiontracker.github.io/RevisionTracker/` in Safari while online. For the Home Screen app, close it fully and reopen it.
6. In Account & Sync, check My subjects, add a subject using the dropdown, and press Save my subjects. If signed in, allow a moment for cloud sync to complete.

The `service-worker.js` supplied here is cache v6 and is based on the v5 network-first version that resolved the previous stale-cache issue.
