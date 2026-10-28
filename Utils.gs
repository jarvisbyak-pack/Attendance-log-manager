function withScriptLock_(callback) { var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Attendance is busy. Please retry in a moment.');try{return callback();}finally{lock.releaseLock();} }

function asIsoDateTime_(value) { if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString(); if (value === null || value === undefined || value === '') return ''; var d = new Date(value); return isNaN(d.getTime()) ? String(value) : d.toISOString(); }
