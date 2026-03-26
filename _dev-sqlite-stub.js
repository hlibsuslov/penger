// Minimal better-sqlite3 stub for dev without native build tools
function noop() {}
function Statement() {}
Statement.prototype.run = noop;
Statement.prototype.get = function() { return undefined; };
Statement.prototype.all = function() { return []; };
Statement.prototype.iterate = function*() {};

function Database() {
  this.prepare = function() { return new Statement(); };
  this.exec = noop;
  this.pragma = function() { return []; };
  this.transaction = function(fn) { return fn; };
  this.close = noop;
}

module.exports = Database;
