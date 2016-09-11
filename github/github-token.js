
require('dotenv').config();
var async = require('async');
var github = require('github')({
  // optional
  debug: true,
  protocol: "https",
  host: "api.github.com",
  headers: {
      "user-agent": "My-Cool-GitHub-App"
  },
  followRedirects: false,
  timeout: 3000
});
var mysql = require('mysql');
var githubUsername = process.env.GITHUB_USER, 
	githubPassword = process.env.GITHUB_PASS, 
	connection;
var tokenTable = "CREATE TABLE IF NOT EXISTS tokens ("+
	"`id` int(11) NOT NULL,"+
	"`token` varchar(100) NOT NULL,"+
	"`session_id` varchar(100) NOT NULL"+
	") ENGINE=InnoDB DEFAULT CHARSET=utf8;";

function GithubToken() {

	connection = mysql.createConnection({
		host     : process.env.DB_HOST,
		user     : process.env.DB_USER,
		password : process.env.DB_PASS,
		database : process.env.DB_NAME
	});

	connection.query(tokenTable);

	return {
		authRequest: function(req, res, next) {
			return authRequest(req, res, next);
		},
		deleteToken: function(sessionId, callback) {
			return deleteToken(sessionId, callback);
		}
	};
}

function authRequest(req, res, next) {
	var sessionId = req.session.id;
	getOrCreateToken(sessionId, function(err, token) {
		if (err) throw err;

		var githubApi = require('./github-api')(token);
		req.githubApi = githubApi;
		next();
	});
}

function getOrCreateToken(sessionId, cb) {

	getToken(sessionId, function(err, token) {
		if (err) cb(err);
		else if (token) cb(null, token);
		else createToken(sessionId, function(err, token) {
			if (err) cb(err);
			cb(null, token);
		});
	});
}

function createToken(sessionId, callback) {

	github.authenticate({
	    type: "basic",
	    username: githubUsername,
	    password: githubPassword
	});

	var note = "session_id: "+sessionId;
	github.authorization.create({
	    scopes: ["public_repo"],
	    note: note,
	    description: note,
	    fingerprint: sessionId
	}, function(err, res) {
		if (err) callback(err);
		else {
	    	data = {id: res.id, token: res.token, session_id: sessionId};
	    	connection.query("INSERT INTO tokens SET ?", data, function(err, result) {
	    		if (err) callback(err);
	    		else callback(null, res.token);
	    	});
	    }
	});
}

function getToken(sessionId, callback) {

	connection.query("SELECT token FROM tokens WHERE session_id = ? LIMIT 1", [sessionId], function(err, results) {
		if (err || typeof results[0] == "undefined") callback(err);
		else callback(null, results[0].token);
	});
}

function refreshToken(sessionId) {


}

function deleteToken(sessionId, callback) {

	async.waterfall([
		function(cb) {
			connection.query("SELECT id FROM tokens WHERE session_id = ? LIMIT 1", [sessionId], function(err, results) {
				if (err || typeof results[0] == "undefined") cb(err);
				else cb(null, results[0].id);
			});
		}, function(tokenId, cb) {
			connection.query("DELETE FROM tokens WHERE id = ?", [tokenId], function(err, result) {
				if (err) cb(err);
				else cb(null, tokenId)
			});
		}, function(tokenId, cb) {
			github.authenticate({
			    type: "basic",
			    username: githubUsername,
			    password: githubPassword
			});
			github.authorization.delete({id: tokenId}, function(err, res) {
				if (err) cb(err)
				else cb(null, tokenId);
			});
		}
	], function(err, result) {
		if (typeof callback == "undefined") return;
		if (err) callback(err);
		else callback();
	});
}

module.exports = GithubToken;
