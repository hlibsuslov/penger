// Dev-only launcher that stubs better-sqlite3 if native module is missing
const Module = require('module');
const origResolve = Module._resolveFilename;
let stubbed = false;

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'better-sqlite3') {
    try {
      return origResolve.call(this, request, parent, isMain, options);
    } catch (e) {
      if (!stubbed) {
        console.log('[dev] better-sqlite3 native module not available — using stub (payment features disabled)');
        stubbed = true;
      }
      // Return a path to our stub
      return require.resolve('./_dev-sqlite-stub.js');
    }
  }
  return origResolve.call(this, request, parent, isMain, options);
};

require('./server.js');
