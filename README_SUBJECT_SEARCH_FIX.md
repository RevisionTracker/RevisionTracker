# Revision Tracker — subject search repair

## What went wrong
I checked the published files at `https://revisiontracker.github.io/RevisionTracker/`. The live `app.js` already contains type-to-search logic, but the live `index.html` still uses the older native `<select id="subjectPicker">`. It does not include the matching search suggestions element. The app JS and page markup were out of sync, so typing to filter could not appear. The stylesheet also lacked the suggestion-panel styles.

## Apply this repair
1. Back up your revision data first.
2. Extract this ZIP.
3. In the existing GitHub repository `revisiontracker/RevisionTracker`, upload **all four** files in this folder to the repository root, replacing the existing `index.html`, `app.js`, `styles.css`, and `service-worker.js`.
4. Commit to `main` and wait for GitHub Pages to publish.
5. Open `https://revisiontracker.github.io/RevisionTracker/` in Safari while online. Close the Home Screen app fully before reopening it.
6. Go to Account & Sync → My subjects. Tap the search box and type `BTEC sport`, `French`, or `eng lit`; suggestions should appear under the search field. Tap a suggestion, then **Add subject**, then **Save my subjects**.

**Do not upload or replace `supabase-config.js`.** This patch does not contain it and will not change your Supabase configuration or credentials.

The patch uses matching HTML and JS, adds CSS for the suggestion list, and bumps the service-worker cache from v7 to v8 so the browser refreshes the repaired files.
