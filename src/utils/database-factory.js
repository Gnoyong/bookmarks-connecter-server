const sqlite3 = require('sqlite3').verbose();

module.exports = {
  get() {
    return new sqlite3.Database('./database.db');
  },
};
