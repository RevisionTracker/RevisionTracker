# Revision Tracker — Smart Study Manager (Phase 1)

This update adds a persistent study-plan manager and a deterministic, shared scheduling engine to the existing Revision Tracker. It is the scheduling foundation for the AI planner; it does **not yet** research specifications or estimate study effort automatically with an AI model. For now, the student enters topics/milestones and a rough weekly effort estimate. The subsequent phase will connect a suitable no-required-payment AI option to help with topic discovery and workload estimates.

## Files to upload

After extracting this package, upload these five files to the **root** of your existing GitHub repository, replacing the current copies:

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `study-planner-engine.js` (new file)

**Do not replace `supabase-config.js`.** It contains the URL, publishable key and public VAPID key you've already configured. Do not run the database SQL again; this update stores plans and availability inside the user's existing `revision_data.data` JSON object, so it does not require new database tables.

## Before updating

1. Open the current tracker and use **Data & reminders → Export backup**. Store the downloaded JSON somewhere safe.
2. Download and extract the ZIP.
3. Upload the five files listed above to the root of `revisiontracker/RevisionTracker` on GitHub. Commit the changes to `main`.
4. Wait for GitHub Pages to publish the update.
5. Open `https://revisiontracker.github.io/RevisionTracker/` directly in Safari while online. If using the Home Screen app, close it completely and reopen it while online. The service-worker cache is bumped to v10 and includes the new scheduler engine.

## How Phase 1 works

### 1. Set availability

Open **Study plans → My availability**. Set normal-day and light-day minute limits, your usual first-session times, a preferred session length, and choose each day as **Normal day**, **Keep it light**, or **Keep free**. These settings are shared across all study plans. Click **Save availability**.

### 2. Create a goal

Enter a plan name, subject, optional current and target position, deadline, priority, a rough weekly effort target, what you want to improve, and topics/milestones (one per line). The current weekly effort is a user estimate because automated AI effort estimation is not part of Phase 1.

Choose **Generate schedule proposal**. The engine considers all active plans together, the plan deadlines, your day preferences, daily minute limits and existing manual sessions. It creates a proposal, balances new sessions across available days and avoids overlapping session times.

### 3. Review and approve

The proposal shows how many requested minutes fit and any workload that could not be placed. A passing capacity check only means the schedule fits the calendar; it does **not** guarantee a grade or outcome. Review the proposed sessions and click **Approve and save schedule** to add them. Until approved, the existing calendar is unchanged.

### 4. Manage multiple plans

The **My study plans** list lets you edit a goal, pause it, resume it, mark it complete, archive it, or permanently delete it with confirmation. Status changes that alter the schedule create a proposal; approve that proposal to replace future incomplete plan-generated sessions. Manually added sessions and completed/past plan-session history are preserved when rebalancing. Deleting a plan permanently removes its linked sessions as well as the plan.

### 5. Backups and sync

Plans and availability are saved in the same application state as revision sessions. If signed in, they sync via the app's existing Supabase account data. The app's JSON export now includes plans and availability, too. Keep manual backups as an extra safeguard.

## What this engine enforces

- No newly generated session is placed before today or after its plan deadline.
- Protected days receive no new plan-generated sessions.
- New sessions respect the configured daily minute limits and preferred time windows.
- Existing manual sessions and completed sessions are treated as commitments.
- Multiple active plans share the available weekly capacity; higher priorities and nearer deadlines receive more weight when capacity is scarce.
- An empty proposal can be approved intentionally, such as when all days are protected, to remove future incomplete generated sessions.

## Known Phase 1 limitation

This phase is the reliable scheduling/data foundation, **not the integrated AI brain yet**. Topic discovery from official course specifications, automatic estimates of workload from a current-to-target improvement goal, conversational plan edits, and evidence-based adaptation are planned for the next phase. Do not treat the user's weekly-minute estimate as an AI assessment of how much work a target will require.

## Safe test checklist

1. Export a backup first.
2. Create a short plan (for example, Chemistry with a deadline about two weeks away and 60–90 minutes/week).
3. Set Sunday to **Keep free**, set a reasonable daily limit, then generate a proposal.
4. Check that no Sunday plan sessions appear and that the capacity summary reports any unplaced workload.
5. Approve the proposal, navigate through the relevant weeks, and confirm sessions appear in the existing Sessions tab.
6. Create a second plan and use **Rebalance all active plans**. Check that schedules share the same daily limits and avoid overlapping times.
7. Edit a plan and review the replacement proposal before approving it.
8. Check that login/cloud sync continues working, then export another backup.

If the app behaves unexpectedly, don't delete `supabase-config.js` or re-run the SQL. Export your data and share the error message without including your password, private VAPID key or any server secret.
