/* Public frontend defaults only. Never put PINs, Telegram tokens, or chat IDs here. */
window.ATTENDANCE_CONFIG = Object.freeze({
  appName: 'Attendance Log Manager',
  defaultExpiryWarningDays: 5,
  requestTimeoutMs: 15000,
  settingsStorageKey: 'attendance-log-manager.settings.v1',
  // Apps Script URL is intentionally blank; configure it in Admin & settings.
  appsScriptUrl: ''
});
