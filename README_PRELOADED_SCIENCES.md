# Revision Tracker: preloaded GCSE sciences

This update preselects these six subjects for new profiles:

- Maths
- English Literature
- English Language
- Biology
- Chemistry
- Physics

Users can untick any they do not study. The searchable GCSE/BTEC catalogue is unchanged.

## Apply the update

1. Export a backup of your revision data first.
2. Upload `index.html`, `app.js`, and `service-worker.js` from this folder to the root of the existing `revisiontracker/RevisionTracker` GitHub repository, replacing those three files.
3. Do **not** replace `supabase-config.js`; keep the working Supabase connection values.
4. Commit to `main` and wait for GitHub Pages to publish.
5. Open the site in Safari while online; completely close and reopen the Home Screen app if using it.
6. Open **Account & Sync → My subjects**. The six subjects should be preselected.

## Existing accounts

If an existing profile has exactly the previous three defaults in the previous order (Maths, English Literature, English Language), this update adds Biology, Chemistry and Physics automatically and saves that migrated list to the account. Profiles with custom subject selections are preserved.

The service worker cache version is bumped to `revision-tracker-v9` so new files are loaded.
