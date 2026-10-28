/** Attendance Log Manager API entry points. Configure Script Properties before deployment. */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'health' || !action) return jsonOutput_({ success: true, status: 'ok', app: 'Attendance Log Manager', time: new Date().toISOString() });
  return jsonOutput_({ success: false, message: 'Use POST for API actions.' });
}
function doPost(e) {
  var request = {};
  try {
    request = JSON.parse(e && e.postData && e.postData.contents || '{}');
    var action = String(request.action || '');
    if (action === 'health') return jsonOutput_({ success: true, status: 'ok', message: 'Apps Script backend is responding.', time: new Date().toISOString() });
    if (action === 'admin.authenticate') return jsonOutput_(authenticateAdmin_(request.pin));
    requireAdminSession_(request.sessionToken);
    var result;
    switch (action) {
      case 'admin.notificationSettings': result = getNotificationSettings_(); break;
      case 'members.search': result = searchMembers_(request); break;
      case 'members.expiry': result = getExpiryLists_(request); break;
      case 'attendance.entry': result = recordAttendanceEntry_(request); break;
      case 'attendance.exit': result = recordAttendanceExit_(request); break;
      case 'attendance.live': result = getLiveAttendance_(); break;
      case 'attendance.history': result = getAttendanceHistory_(request); break;
      case 'attendance.snapshot': result = getAttendanceSnapshot_(); break;
      default: throw new Error('Unknown API action: ' + action);
    }
    return jsonOutput_(Object.assign({ success: true }, result || {}));
  } catch (err) {
    logAuditEvent_('API_ERROR', { action: request.action || 'unknown', message: String(err && err.message || err) });
    return jsonOutput_({ success: false, message: String(err && err.message || err) });
  }
}
function jsonOutput_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
