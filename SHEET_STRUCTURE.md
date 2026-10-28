# Attendance Log Manager — Google Sheets structure

The backend expects these three tabs, with header rows in row 1. Header spelling is flexible for supported aliases, but keep one consistent header per field. Do not modify or renumber existing Membership IDs.

## Clients
Required fields: `Membership ID`, `Name`, `Mobile`. Additional client fields may be retained; member search returns the client row as supplementary data.

## Membership
Required fields: `Membership ID`, `Package`, `Start Date`, `End Date`. Each member should have one current membership row for this initial version. If historical membership rows exist, the current-membership selection rule must be agreed before production.

## Attendance
Recommended headers: `Date`, `Membership ID`, `Name`, `Mobile`, `Entry Time`, `Exit Time`, `Duration Minutes`, `Membership Status`, `Start Date`, `End Date`, `Package`, `Warning`, `Event`, `Status`.

The code recognizes common variants such as `Member ID`, `Time In`, `Time Out`, `Check In`, and `Check Out`. Dates should be actual Google Sheets date values or ISO-like `YYYY-MM-DD` values. Entry/exit timestamps should be date-time cells.

## Script Properties (server only)
Set `SPREADSHEET_ID`, `ADMIN_PIN_HASH`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `EXPIRY_WARNING_DAYS` (default 5), `TELEGRAM_ENABLED`, `NOTIFY_ENTRY`, `NOTIFY_EXIT`, `NOTIFY_EXPIRY`, `NOTIFY_SECURITY` in Apps Script Project Settings. Never put secrets in GitHub frontend files.
