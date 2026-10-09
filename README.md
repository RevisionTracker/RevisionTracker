# GCSE Revision Tracker — iPhone web app

This is a small, offline-friendly Progressive Web App (PWA). On iPhone, open the published HTTPS address in Safari and use **Share → Add to Home Screen**. It does not require a Mac or the PC to remain on once hosted and installed.

## What it includes
- Weekly navigation with dated Monday–Sunday weeks.
- Daily revision status.
- Revision sessions with day, time, subject, planned minutes, completion and notes.
- A subject breakdown and weekly summary.
- Free ChatGPT copy/paste planning workflow with JSON validation/import (no API key or API calls).
- JSON backup/import, including compatibility with the earlier Python `revision_data.json` structure.
- Export to `.ics` calendar events, each with a 10-minute reminder alarm. Add the events to Apple Calendar and confirm Calendar alerts are enabled.
- App shell caching for offline use after the first successful visit.

## Important limitations

- This version stores data in browser storage on the device. It does **not** sync between devices. Export a JSON backup regularly. Clearing Safari/site data may delete the locally stored records.
- The AI is not embedded in the app and does not run automatically. The no-API-cost route is to copy the generated prompt to ChatGPT, then paste its JSON output back into the app. ChatGPT availability and free-plan limits still apply.
- The calendar export is a snapshot of the selected week. Export it again after changing sessions. Calendar is used to deliver reminders even when the app is closed or the computer is off.
- Do not upload personal revision notes or records to a public GitHub repository. The website's source files can be public; the app's data remains in browser storage and is not published by this app.

## Host it for free with GitHub Pages

1. Sign in to GitHub and create a new **public** repository, for example `revision-tracker`.
2. Upload the contents of this folder to the repository root (so `index.html` is at the root, not nested in another folder).
3. Open the repository's **Settings → Pages**.
4. Under the build/deployment option, choose deploying from a branch; select the `main` branch and `/(root)`, then save.
5. When GitHub Pages publishes it, open the supplied `https://...github.io/...` link.
6. On iPhone, open that link in **Safari**, tap **Share → Add to Home Screen**, enable **Open as Web App** if that option appears, then tap **Add**.
7. Open the home-screen app while online once. Then test by enabling Airplane Mode and reopening it.

The repository's source code is public if using GitHub Pages on GitHub Free. Do not put passwords, API keys, private data or your actual revision-data JSON in that repository. This app has no server and does not upload your revision data.

## Updating the app

Upload updated source files to the same repository. If the iPhone keeps an old cached version, close the web app fully and reopen it online. A service-worker cache name change (`revision-tracker-v1` in `service-worker.js`) forces a fresh cache after code changes.

## Local preview on a computer

Service workers need HTTPS (or localhost) to work. Open this directory in an editor and run a local web server, then visit its `http://localhost` address. For example, if Python is installed, run `python -m http.server 8000` in this directory and open `http://localhost:8000` on that same computer. This is only for preview; your iPhone needs a publicly accessible HTTPS address to install and use it away from the PC.
