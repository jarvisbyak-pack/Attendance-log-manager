# Attendance Log Manager — Full Audit & Professional Remediation Plan

**Repository:** `jarvisbyak-pack/Attendance-log-manager`  
**Audited ref:** `main`  
**Audit type:** Static source review of the committed frontend and Google Apps Script backend  
**Status:** Initial source audit complete; live integration and end-to-end tests remain outstanding.  
**Safety rule:** This document is a plan only. No production behavior or member data has been changed by this audit.

## Executive summary

The current app has a usable starting structure, but its navigation, authorization model, refresh behavior, settings semantics, attendance state, member selection, and backend security need correction before it should be treated as a professional production app.

The most important issues are:
1. The reception workflow conflicts with the backend's admin-session requirement.
2. Several tab refresh buttons invoke the same generic refresh that only updates recent activity and live attendance.
3. The Telegram checkbox and notification counter do not represent real backend notification state.
4. Member search silently selects the first match instead of letting staff choose the correct person.
5. The selected member's attendance display can remain stale after entry/exit.
6. Member-search responses include the entire source client row.
7. Current membership selection is ambiguous when a member has historical membership rows.
8. PIN brute-force throttling, expiry-notification scheduling, and live Apps Script integration tests are missing or not implemented.

## Scope and confidence

Reviewed the current GitHub source for:
- `index.html`, `app.js`, `styles.css`, `config.js`
- `Code.gs`, `Config.gs`, `Sheets.gs`, `Members.gs`, `Attendance.gs`, `Admin.gs`, `Notifications.gs`, `Utils.gs`
- `appsscript.json`, `README.md`, `SHEET_STRUCTURE.md`

This is a static audit, not a live deployment test. Findings based directly on the code are marked **Confirmed**. Issues that depend on actual spreadsheet headers, deployed Apps Script behavior, or the intended gym policy are marked **Verify/Decision required**.

---

## Findings register

### P0 — Resolve before production use

#### P0-1. Reception authorization is inconsistent — Confirmed
- The UI presents authentication under **Admin & Settings**.
- The backend requires an admin session for every action other than health and PIN authentication, including member search, attendance entry/exit, history, and live attendance.
- The frontend only attaches a session token if one is already present, so normal reception operations fail before authentication.
- This conflicts with the apparent workflow in which reception staff can use the reception screen while settings remain restricted.

**Remediation:** define role boundaries and implement them consistently on both client and server. Do not simply remove backend authentication. Preferred model: separate permissions for reception operations and admin configuration, with an explicit staff authorization method. Every write must remain server-authorized.

#### P0-2. Member search silently selects the first result — Confirmed
- Reception search chooses `r.member` or the first item in `r.members`.
- A partial name or mobile search can return multiple records, but the interface does not require a deliberate selection before entry/exit.

**Remediation:** show a results list with ID, full name, mobile suffix, and membership status. Require a staff click/tap to select a member. Do not enable attendance actions until a single member is explicitly selected and verified.

#### P0-3. Full client rows are returned to the browser — Confirmed
- `buildMember_` returns `clientDetails: client`, which includes all columns in the Clients sheet.
- The frontend does not need the entire source row to render the member card.

**Remediation:** return a strict allowlist DTO (membership ID, display name, masked/full mobile according to role, package, dates, status, days remaining, attendance state, warnings). Keep unrelated or sensitive spreadsheet columns server-side.

#### P0-4. Expired-member entry behavior is unresolved — Decision required
- The backend currently permits an expired member's entry and logs a security event; the interface also says the policy is not finalized.
- This is a business rule, not something the audit should silently choose.

**Remediation:** obtain an explicit policy: block entry, allow with warning, or allow only with an authorized override. Enforce it server-side and test all three relevant states (active, expiring, expired).

#### P0-5. Admin PIN has no explicit throttling — Confirmed
- Authentication hashes the submitted PIN and compares it to a stored SHA-256 hash.
- Failed attempts are logged, but no explicit per-user/IP/device throttling, lockout window, or escalating delay is implemented.
- A six-character minimum alone is not sufficient protection for an anonymously reachable web app.

**Remediation:** add server-side failed-attempt throttling and cooldown, avoid returning overly revealing authentication errors, and review deployment exposure. Consider a stronger authentication mechanism if the deployment model supports it.

### P1 — Core functionality defects

#### P1-1. Refresh buttons update the wrong tab — Confirmed
- Every element with `.refresh-action` is wired to `refreshAll()`.
- `refreshAll()` only refreshes the recent feed and live attendance.
- Consequently, History, Members, and Expiry Monitor refresh controls do not load their own tab's data.

**Remediation:** bind each tab's refresh control to its own loader. Keep a separate global refresh only if its scope is clearly labelled.

#### P1-2. Selected-member attendance state can become stale — Confirmed
- After a successful entry/exit, the frontend mutates `attendanceStatus` but does not consistently re-render the selected member panel.
- The entry and exit buttons are re-enabled regardless of the new state.

**Remediation:** use the authoritative response or re-fetch the selected member after each action; update the badge and attendance state; disable impossible actions (entry while already inside, exit while outside); retain server-side validation as the source of truth.

#### P1-3. Connection test may test a stale URL — Confirmed
- The test handler calls the API using the saved in-memory setting.
- If an admin edits the URL field and presses **Test backend connection** before saving, the test can use the previous URL rather than the value in the field.

**Remediation:** validate and test the current field value explicitly, then report which endpoint was tested without exposing sensitive query data.

#### P1-4. Expiry warning days are inconsistently applied — Confirmed
- The warning-day setting is saved locally in the browser.
- Search and the expiry monitor pass it to the backend, but attendance entry recomputes member status without passing the override.
- The setting is not a server-side configuration change, despite appearing in Settings.

**Remediation:** decide whether this is a per-device display preference or a global admin setting. For a global setting, store it server-side and read one canonical value for search, entry, expiry lists, and notifications. Validate zero correctly; the current `Number(value) || 5` path turns zero into five when local settings are loaded.

#### P1-5. Recent activity description does not match behavior — Confirmed
- The UI says the feed updates when staff search, act, or refresh.
- Member search does not refresh the recent feed.

**Remediation:** either update the feed after search or correct the helper text. Prefer updating after successful mutations and on explicit refresh, and clearly show the last-updated time.

#### P1-6. Current membership row is selected by first match — Confirmed / policy required
- The backend uses the first Membership row with a matching ID.
- If the sheet contains renewal history or multiple membership rows, an older or expired row may be used.

**Remediation:** define a current-membership rule before production (for example, explicit current flag or latest valid start date), preserve history, and test same-day renewals, future memberships, expired memberships, and overlapping periods.

#### P1-7. Expiry notification path is incomplete — Confirmed from current source
- Script properties exist for expiry notifications, but the reviewed code has no scheduled expiry sweep that finds upcoming expirations and sends notifications.
- The Telegram checkbox does not change backend Script Properties and the UI does not expose the individual notification flags returned by the backend.

**Remediation:** separate notification delivery from notification configuration. Add a protected backend settings view, a test-notification action, and a scheduled daily expiry scan with deduplication so the same member does not receive repeated alerts for the same threshold.

#### P1-8. Error/loading states are inconsistent — Confirmed
- Some loaders only update the table on failure; other summary areas can retain stale values.
- Buttons and tables do not consistently indicate loading, disable duplicate requests, or show a last-successful refresh time.

**Remediation:** standardize loading, empty, success, stale-data, and error states for each tab. Prevent duplicate submissions and preserve previous data only when clearly labelled as stale.

### P2 — Data correctness, auditability, and UX

#### P2-1. Search matches every source column — Confirmed
- Member lookup searches all object keys/values from the Clients row, including fields that are not intended as search keys.
- This can produce confusing matches and compounds the unnecessary source-row exposure.

**Remediation:** search only explicitly approved fields (membership ID, name, normalized phone number), normalize Indian phone formats, and provide exact-ID priority plus clear multiple-match selection.

#### P2-2. Attendance history has a fixed 500-record cap — Confirmed
- The backend returns at most 500 matching records with no pagination metadata or UI.
- Older records may appear missing without explanation.

**Remediation:** implement server-side pagination or date-window filtering and show result counts / truncation messages.

#### P2-3. Live attendance and history need edge-case validation — Verify
- The code relies on consistent date values and known header aliases.
- Cross-day sessions, malformed timestamps, alternate header names, and date-only values should be tested against a real test spreadsheet.

**Remediation:** use a canonical timestamp/date model, define overnight-session behavior, and test all supported header aliases. Do not infer an exit for an open session without a defined rule.

#### P2-4. Audit events are stored in Script Properties — Confirmed design risk
- Audit history is serialized into one Script Properties value and capped at 200 events.
- Script Properties have per-value size limits; as event details grow, writes can fail. The failure is caught and only logged to the execution log, so the application audit trail can silently become incomplete.

**Remediation:** store audit events in a dedicated append-only sheet or another durable log, with retention and access rules. Avoid logging unnecessary personal data.

#### P2-5. Keypad is oversized for numeric Membership IDs — Confirmed UX mismatch
- The reception keypad renders digits plus A–Z across many rows, despite the documented numeric-only Membership ID convention.
- It consumes vertical space and is poorly suited to quick reception entry.

**Remediation:** use a compact numeric keypad for ID entry, retain the standard keyboard for name/mobile searches, and make keypad visibility optional on small screens.

#### P2-6. Notification panel is an in-memory toast log — Confirmed
- Every toast is counted as a notification; it is not a feed of backend events and is lost on reload.
- The badge can therefore imply real alerts when it only reflects UI messages.

**Remediation:** rename it to “Recent messages” if it remains local, or build a real notification feed with source, timestamp, delivery state, read/unread status, and server-side retrieval.

#### P2-7. Responsive/accessibility polish — Verify in browser
- The page has a responsive stylesheet, but mobile layout, keyboard navigation, focus handling, modal escape behavior, screen-reader announcements, and touch targets have not been validated in a real browser/device.

**Remediation:** test narrow phone, tablet, and desktop widths; add predictable focus management and visible focus states; verify contrast and labels; do not rely on color alone for status.

---

## Recommended professional information architecture

Keep the navigation focused on staff tasks and move configuration away from routine reception work:

1. **Reception** — primary search, explicit member selection, membership status, entry/exit actions, and a small recent-activity strip.
2. **Live Attendance** — current open sessions, elapsed duration, status, and a tab-specific refresh.
3. **Attendance History** — date range, member/ID filter, entry/exit, duration, export, pagination, and audit context where authorized.
4. **Members** — searchable directory, clear match selection, membership summary, contact details according to role, and membership history.
5. **Membership Expiry** — expiring soon, expired, thresholds, next action, and notification delivery status. Avoid duplicating full member-management functionality here.
6. **Notifications** — only if a real backend notification feed is implemented. Otherwise remove the notification counter/panel or rename it to local “Recent messages.”
7. **Admin & Settings** — protected configuration: endpoint health, roles/access, expiry threshold, notification channel and event toggles, test notification, audit log, and integration diagnostics.

Do not add a separate Dashboard unless the gym actually needs an overview distinct from Reception. If one is added, it should contain operational metrics and shortcuts, not duplicate all the other tabs.

## Remediation sequence

### Phase 0 — Confirm policy and protect data
- [ ] Decide reception authorization model and roles.
- [ ] Decide expired-member entry policy.
- [ ] Define the authoritative current-membership selection rule.
- [ ] Create a test spreadsheet and test Apps Script deployment; never use live member data for initial verification.
- [ ] Preserve current production files and create a dedicated remediation branch before code changes.

### Phase 1 — Fix core workflows
- [ ] Correct each tab's refresh handler.
- [ ] Implement multi-match member selection.
- [ ] Synchronize attendance state and action-button eligibility after entry/exit.
- [ ] Make connection testing use the entered URL.
- [ ] Make expiry threshold semantics consistent across all relevant functions.
- [ ] Align recent-activity behavior and helper text.
- [ ] Add clear loading, empty, error, and stale-data states.

### Phase 2 — Security and backend correctness
- [ ] Enforce role-specific authorization on the server.
- [ ] Minimize member data returned to the browser.
- [ ] Add PIN attempt throttling/cooldown and security tests.
- [ ] Replace first-match membership selection with the approved rule.
- [ ] Move audit events out of the single Script Properties blob.
- [ ] Add pagination for history and explicit request/response schemas.
- [ ] Add scheduled expiry checks, deduplication, and delivery logs only after notification policy is confirmed.

### Phase 3 — UI/UX restructuring
- [ ] Reduce reception keypad to numeric-only or make it optional.
- [ ] Make each tab's purpose distinct; remove duplicated or misleading controls.
- [ ] Separate notification preferences from local UI messages.
- [ ] Standardize buttons, tables, badges, spacing, and responsive behavior.
- [ ] Add accessible focus, keyboard, touch, and status behavior.

### Phase 4 — Automated and live verification
- [ ] Unit-test date parsing, expiry boundaries, phone normalization, membership matching, and current-membership selection.
- [ ] Test active, expiring, expired, missing-date, and duplicate-membership cases.
- [ ] Test duplicate entry, exit without entry, repeated exit, simultaneous requests, and cross-day attendance.
- [ ] Test all tab refresh controls against mocked responses and verify the correct endpoint is called.
- [ ] Test unauthorized access, expired sessions, repeated failed PINs, and role permissions.
- [ ] Test Telegram disabled, enabled, failed delivery, scheduled expiry notification, and duplicate-notification suppression.
- [ ] Run a browser test on mobile, tablet, and desktop.
- [ ] Complete a live test using only a test spreadsheet; verify writes and audit records before considering deployment.

## Acceptance criteria for a professional release

- Every visible button performs the action its label promises.
- Each tab loads and refreshes its own data and clearly reports failures.
- Staff must explicitly select the correct member before a write action.
- Entry/exit controls reflect the current attendance state, while the backend remains authoritative.
- Admin and reception permissions are consistent and tested server-side.
- No unnecessary client-row fields are sent to the browser.
- Membership status and expiry thresholds are consistent across Reception, Members, Expiry Monitor, and entry authorization.
- Notification UI reflects real configured/delivered events, not ordinary toast messages.
- Historical records are paginated or clearly bounded.
- No production data is used until the test deployment passes the checklist.
- A release candidate has repeatable automated test results and a documented rollback path.

## Open decisions

These cannot safely be decided by code inspection alone:
1. Can reception staff search and record attendance without admin PIN? If yes, what separate authorization should they use?
2. Should expired memberships be blocked, allowed with warning, or allowed only through an authorized override?
3. Can the Membership sheet contain historical rows, and how is the current membership identified?
4. Should expiry alerts be sent at configurable thresholds (for example, 7/3/1 days), and should each threshold send only once per membership cycle?
5. Which roles may view full mobile numbers, export attendance history, or inspect audit/security events?

## Final status

**Static audit: findings documented.**  
**Code fixes: not started.**  
**Live Apps Script / spreadsheet verification: pending.**  
**Production deployment: not performed.**
