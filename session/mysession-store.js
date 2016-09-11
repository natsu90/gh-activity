'use strict';

var debug_log = require('debug')('express-mysql-session:log');
var debug_error = require('debug')('express-mysql-session:error');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var util = require('util');
var async = require('async');
var githubToken = require('./github-token')();

function MySessionStore() {
    MySQLStore.apply(this, arguments);
}

util.inherits(MySessionStore, MySQLStore);

MySessionStore.prototype.clearExpiredSessions = function(cb) {

		debug_log('Clearing expired sessions');

		var selectSql = 'SELECT session_id FROM ?? WHERE ?? < ?';

		var params = [
			this.options.schema.tableName,
			this.options.schema.columnNames.expires,
			Math.round(Date.now() / 1000)
		];
		
		var that = this;
		this.connection.query(selectSql, params, function(error, results) {
			if (error) throw error;
			else async.each(results, function(result, callback) {
				var sessionId = result.session_id;
				that.connection.query("DELETE FROM ?? WHERE session_id = ?", 
					[that.options.schema.tableName, sessionId], function(error) {
					if (error) {
						debug_error('Failed to clear expired sessions.');
						debug_error(error);
						callback(err);
					}
					githubToken.deleteToken(sessionId);
					callback();
				});
			}, function(err, result) {
				if (err) {
					return cb && cb(err);
				}
				cb && cb();
			});
		});
	};

module.exports = MySessionStore;