function authenticateAdmin_(pin) { var expected=getScriptProperty_(APP_CONFIG.PROP_ADMIN_PIN_HASH,'');if(!expected)throw new Error('ADMIN_PIN_HASH is not configured in Script Properties.');if(!pin||hashPin_(pin)!==expected){logSecurityEvent_('ADMIN_AUTH_FAILED',{});throw new Error('Incorrect admin PIN.');}var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');CacheService.getScriptCache().put(APP_CONFIG.SESSION_PREFIX+token,'admin',APP_CONFIG.SESSION_TTL_SECONDS);logAuditEvent_('ADMIN_AUTH_SUCCESS',{});return {success:true,sessionToken:token,expiresInSeconds:APP_CONFIG.SESSION_TTL_SECONDS}; }
function requireAdminSession_(token) { if(!token||CacheService.getScriptCache().get(APP_CONFIG.SESSION_PREFIX+String(token))!=='admin'){logSecurityEvent_('UNAUTHORIZED_API_REQUEST',{});throw new Error('Admin session is missing or expired. Authenticate again.');} }

function authenticateReception_(pin) {
  var expected=getScriptProperty_(APP_CONFIG.PROP_RECEPTION_PIN_HASH,'');
  if(!expected) throw new Error('RECEPTION_PIN_HASH is not configured in Script Properties.');
  if(!pin || hashPin_(pin)!==expected) {
    logSecurityEvent_('RECEPTION_AUTH_FAILED',{});
    throw new Error('Reception PIN was not accepted.');
  }
  var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  CacheService.getScriptCache().put(APP_CONFIG.SESSION_PREFIX+token,'reception',APP_CONFIG.SESSION_TTL_SECONDS);
  logAuditEvent_('RECEPTION_AUTH_SUCCESS',{});
  return {success:true,sessionToken:token,expiresInSeconds:APP_CONFIG.SESSION_TTL_SECONDS,role:'reception'};
}
function requireReceptionSession_(token) {
  var role=token ? CacheService.getScriptCache().get(APP_CONFIG.SESSION_PREFIX+String(token)) : '';
  if(role!=='reception' && role!=='admin') {
    logSecurityEvent_('UNAUTHORIZED_RECEPTION_API_REQUEST',{});
    throw new Error('Reception session is missing or expired. Sign in again.');
  }
}
function setInitialReceptionPinHash(pin) {
  if(!pin || String(pin).length < 6) throw new Error('Use a reception PIN/passphrase with at least 6 characters.');
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP_RECEPTION_PIN_HASH,hashPin_(pin));
  return 'RECEPTION_PIN_HASH saved. Do not store the PIN in source files or commit it.';
}
