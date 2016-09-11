
require('dotenv').config();
var github = require('github')({
  debug: true,
  protocol: "https",
  host: "api.github.com",
  headers: {
      "user-agent": "My-Cool-GitHub-App"
  },
  followRedirects: false,
  timeout: 3000
});
var async = require('async');
var mysql = require('mysql');
var githubUsername = process.env.GITHUB_USER,
	githubToken;

function GithubApi(token) {

	githubToken = token;
	return {
		getUser: function(userId, callback) {
			return getUser(userId, callback);
		},
		getRepos: function(userId, startDate, callback) {
			return getRepos(userId, startDate, callback);
		},
		getEvents: function(userId, startDate, repoIds, page, callback) {
			return getEvents(userId, startDate, repoIds, page, callback);
		}
	};
}

function authenticate() {
	github.authenticate({
	    type: "basic",
	    username: githubUsername,
	    password: githubToken
	});
}

function getUser(userId, callback) {
	authenticate();
	github.users.getForUser({user: userId}, 
      function(err, resp) {
        if (err) callback(err);
        else callback(null, resp);
    });
}

function getRepos(userId, startDate, callback) {

}

function getEvents(userId, startDate, repoIds, page, callback) {

}

module.exports = GithubApi;