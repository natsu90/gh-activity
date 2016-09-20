
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var store = {
		state: {
			message: '',
			repos: [],
			period: '',
			repoid: '',
			// repoids: []
		},
		updateMessage: function(msg) {
			if (!store.state.message)
				store.state.message = msg;
		},
		clearMessage: function() {
			store.state.message = '';
		},
		hasReachedLimit: function(timestamp) {
			timestamp = parseInt(timestamp) * 1000;
			store.updateMessage('You have exceeded Github API limit. Reload page after <u>'+ moment().from(moment(timestamp), true) +
				'</u>, or login to remove the limit. <a href="/login" class="btn btn-sm btn-primary"><span class="octicon octicon-mark-github"></span> Login</a>');
		},
		getRepoById: function(repoid) {
			var repos = store.state.repos;
			for (var i = 0; i < repos.length; i++) {
				if (repos[i].id == repoid)
					return repos[i];
			}
			return false;
		},
		addRepo: function(repo) {
			var repos = store.state.repos
			for (var i = 0; i < repos.length; i++) {
				if (repos[i].id == repo.id)
					return;
			}
			store.state.repos.push(repo);
		},
		setPeriod: function(period) {
			store.state.period = period;
		}
	};

/*-----------------
	Components 
-----------------*/

var message = Vue.component('message', {
	template: '#message',
	data: function() {
		return {
			sharedState: store.state
		}
	}
});

var profile = Vue.component('profile', {
	template: '#profile',
	props: ['userid'],
	created: function() {
		var self = this,
			access_token = this.$cookie.get('github-token');
	    this.$http.get("https://api.github.com/users/" + this.userid + (access_token ? "?access_token=" + access_token : ""))
	    .then(function(resp) {
	        self.$set('user', resp.data);
	    }, function(err) {
	    	switch (err.status) {
	    		case 404:
	    			store.updateMessage('User of '+ self.userid + ' is not found');
	    		case 403:
	    			store.hasReachedLimit(err.getResponseHeader('X-RateLimit-Reset'));
	    		default:
	    			store.updateMessage(err.message);
	    	}
	    });
	},
	methods: {
		moment: function(data) {
			return moment(data);
		}
	}
});

var periods = Vue.component('periods', {
	template: '#periods',
	data: function() {
		var format = 'YYYY-MM-DD HH',
			current_period = moment().utc().format(format);
			store.setPeriod(current_period);
		return {
			periods: [
				{value: current_period, text: 'today'},
				{value: moment().utc().subtract(1, 'week').format(format), text: '1 week'},
				{value: moment().utc().subtract(1, 'month').format(format), text: '1 month'},
				{value: moment().utc().subtract(3, 'months').format(format), text: '3 months'},
				{value: moment().utc().subtract(6, 'months').format(format), text: '6 months'},
				{value: moment().utc().subtract(1, 'year').format(format), text: '1 year'}
			],
			sharedState: store.state
		}
	}
});

var contribution = Vue.component('contribution', {
	template: '#contribution',
	props: ['userid', 'period'],
	watch: {
		period: function() {
			this.fetchData();
		}
	},
	created: function() {
		this.fetchData();
	},
	methods: {
		fetchData: function() {
			var self = this;
		    this.$http.get("/api/v1/user/"+ this.userid +"/repos/"+ this.period)
		    .then(function(resp) {
		        self.$set('repoIds', resp.data);
		    });
		},
		mostStars: function(a, b) {
			var repoA = store.getRepoById(a), repoB = store.getRepoById(b);
			return repoA.stargazers_count - repoB.stargazers_count;
		}
	}
});

var	repository = Vue.component('repository', {
	template: '#repository',
	props: ['repoid'],
	/*data: function() {
		return {
			sharedState: store.state
		}
	},*/
	created: function() {
		var self = this,
			access_token = this.$cookie.get('github-token');
	    this.$http.get("https://api.github.com/repositories/"+ this.repoid + (access_token ? "?access_token=" + access_token : ""))
	    .then(function(resp) {
	    	var repo = resp.data;
	        self.$set('repo', repo);
	        store.addRepo(repo);
	    }, function(err) {
	    	if (err.status == 403)
	    		return store.hasReachedLimit(err.getResponseHeader('X-RateLimit-Reset'));
	    	else
	    		store.updateMessage(err.message);
	    });
	}
});

var events = Vue.component('events', {
	template: '#events',
	props: ['userid', 'period', 'repoid'],
	components: {
    	VPaginator: VuePaginator
  	},
  	data: function() {
  		return {
  			events: [],
  			resource_url: "/api/v1/user/"+ this.userid +"/events/"+ this.period +"?page=1&repo_id="+ this.repoid
  		}
  	},
  	watch: {
  		period: function(value) {
  			this.$set("resource_url", "/api/v1/user/"+ this.userid +"/events/"+ value +"?page=1&repo_id="+ this.repoid);
  		},
  		repoid: function(value) {
  			this.$set("resource_url", "/api/v1/user/"+ this.userid +"/events/"+ this.period +"?page=1&repo_id="+ value);
  		}
  	}
});


var event = Vue.component('event', {
	template: '#event',
	props: ['event'],
	computed: {
		data: function() {
			return JSON.parse(this.event.payload);
		},
		icon: function() {
			switch(this.event.type) {
				case 'PushEvent':
					return 'git-commit';
				case 'CommitCommentEvent':
				case 'IssueCommentEvent':
				case 'PullRequestReviewCommentEvent':
					return 'comment-discussion';
				case 'IssuesEvent':
					switch (this.data.action) {
						case 'closed':
							return 'issue-closed';
						case 'reopened':
							return 'issue-reopened';
						default:
							return 'issue-opened';
					}
				case 'PullRequestEvent':
					return 'git-pull-request';
				default:
					return 'info';
			}
		},
		action: function() {
			repo = store.getRepoById(this.event.repo_id);
			if(!repo) {
				return this.event.type + ' to Repo ID: '+this.event.repo_id; 
			}
			switch (this.event.type) {
				case 'PushEvent':
					return 'Pushed <a target="blank" href="'+repo.html_url+'/compare/'+this.data.before.substr(0, 10)+'...'+this.data.head.substr(0, 10)+'" >'
						+ this.data.size +' commit(s)</a> to <a href="'+repo.html_url+'">'+ repo.full_name+'</a>';
				case 'IssueCommentEvent':
					return 'Commented on '+ (typeof this.data.issue.pull_request == 'undefined' ? 'issue' : 'pull request ')
						+' <a traget="blank" href="'+this.data.comment.html_url+'">'+repo.full_name+'#'+this.data.issue.number+'</a>';
				case 'PullRequestEvent':
					var action = this.data.action.capitalize(),
						pullRequestLink = '<a traget="blank" href="'+this.data.pull_request.html_url+'">'
								+repo.full_name+'#'+this.data.pull_request.number+'</a>';

					if (this.data.action == 'closed') {
						if (this.data.pull_request.merged)
							action = 'Merged';
						else
							action = 'Rejected';
					}
					return action + ' pull request ' + pullRequestLink;
				case 'IssuesEvent':
					var issueLink = '<a traget="blank" href="'+this.data.issue.html_url+'">'
								+repo.full_name+'#'+this.data.issue.number+'</a>';
					return this.data.action.capitalize() + ' issue ' + issueLink;
				case 'PullRequestReviewCommentEvent':
					return 'Reviewed on pull request <a traget="blank" href="'+this.data.comment.html_url+'">'+repo.full_name+'#'+this.data.pull_request.number+'</a>';
				case 'CommitCommentEvent':
					return 'Commented on commit <a traget="blank" href="'+this.data.comment.html_url+'">'+repo.full_name+'@'+this.data.comment.commit_id.substr(0, 10)+'</a>';
				default:
					return this.event.type + ' to <a target="blank" href="'+repo.html_url+'">'+ repo.full_name+'</a>';
			}
		},
		detail: function() {
			if (this.data.comment)
				return marked(this.data.comment.body);
			else if (this.data.pull_request)
				return this.data.pull_request.title;
			else if (this.data.issue)
				return this.data.issue.title;
		},
		past: function() {
			return moment(this.event.created_at + ' +0000').fromNow();
		}
	}
});

/*-----------------
   Initialize app 
-----------------*/

new Vue({
	el: 'body',
	data: {
		sharedState: store.state
	},
	watch: {
		'sharedState.repoid': function(value, oldValue) {
			console.log('update', value, oldValue);
		}
	},
	methods: {
		getProfile: function() {
			if (this.userName)
				window.location = '/'+ this.userName;
		}
	}
});