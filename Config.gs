/** Server-only configuration. Set these in Apps Script > Project Settings > Script Properties. */
var APP_CONFIG = Object.freeze({
  PROP_SPREADSHEET_ID: 'SPREADSHEET_ID', PROP_ADMIN_PIN_HASH: 'ADMIN_PIN_HASH', PROP_RECEPTION_PIN_HASH: 'RECEPTION_PIN_HASH',
  PROP_TELEGRAM_BOT_TOKEN: 'TELEGRAM_BOT_TOKEN', PROP_TELEGRAM_CHAT_ID: 'TELEGRAM_CHAT_ID',
  PROP_EXPIRY_WARNING_DAYS: 'EXPIRY_WARNING_DAYS', PROP_TELEGRAM_ENABLED: 'TELEGRAM_ENABLED',
  PROP_NOTIFY_ENTRY: 'NOTIFY_ENTRY', PROP_NOTIFY_EXIT: 'NOTIFY_EXIT',
  PROP_NOTIFY_EXPIRY: 'NOTIFY_EXPIRY', PROP_NOTIFY_SECURITY: 'NOTIFY_SECURITY',
  SESSION_PREFIX: 'ALM_SESSION_', SESSION_TTL_SECONDS: 21600,
  SHEET_CLIENTS: 'Clients', SHEET_MEMBERSHIP: 'Membership', SHEET_ATTENDANCE: 'Attendance'
});
function getScriptProperty_(key, fallback) { var value = PropertiesService.getScriptProperties().getProperty(key); return value === null || value === '' ? fallback : value; }
function getSpreadsheet_() { var id = getScriptProperty_(APP_CONFIG.PROP_SPREADSHEET_ID, ''); if (!id) throw new Error('SPREADSHEET_ID is not configured in Script Properties.'); return SpreadsheetApp.openById(id); }
function getExpiryWarningDays_(override) { var n = Number(override); if (!isFinite(n) || n < 0) n = Number(getScriptProperty_(APP_CONFIG.PROP_EXPIRY_WARNING_DAYS, '5')); return Math.max(0, Math.min(90, isFinite(n) ? n : 5)); }
function hashPin_(pin) { var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin), Utilities.Charset.UTF_8); return bytes.map(function(b){ var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join(''); }
function setInitialAdminPinHash(pin) { if (!pin || String(pin).length < 6) throw new Error('Use an admin PIN/passphrase with at least 6 characters.'); PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP_ADMIN_PIN_HASH, hashPin_(pin)); return 'ADMIN_PIN_HASH saved. Remove or protect any setup notes containing the PIN.'; }
