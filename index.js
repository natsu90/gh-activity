
require('dotenv').config();
var express = require('express'),
    app = express(), 
	 router  = express.Router();
var mysql = require('mysql');
var db_detail = {
  host     : process.env.DB_HOST,
  port     : process.env.DB_PORT,
  user     : process.env.DB_USER,
  password : process.env.DB_PASS,
  database : process.env.DB_NAME,
  // for githubToken below
  //expiration: 30000,
  //checkExpirationInterval: 10000
};
var connection = mysql.createConnection(db_detail);
var async = require('async');

/*
 * Deprecated
 *
 * Because apperantly Github API is limited to per account, NOT per token
 * But I didn't throw away this code because it is a hardwork and new thing I learnt,
 * and I may come back here to refer again
 */

/*
var githubToken = require('github/github-token')();

var session = require('express-session');
var MySessionStore = require('session/mysession-store');

var sessionStore = new MySessionStore(db_detail);

app.use(session({
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: true,
    saveUninitialized: true
}));

// put githubToken.authRequest as second parameter in each route, then you will get access of req.githubApi
*/

var staticRoot = __dirname + '/';
app.use(express.static(staticRoot));

var cookieParser = require('cookie-parser')
app.use(cookieParser());

app.engine('.html', require('ejs').__express);
//app.set('views', __dirname + '/views');
app.set('view engine', 'html');

/* GitHub OAuth */
var githubOAuth = require('github-oauth')({
  githubClient: process.env['GITHUB_CLIENT'],
  githubSecret: process.env['GITHUB_SECRET'],
  baseURL: process.env['BASE_URL'],
  loginURI: '/login',
  callbackURI: '/callback',
  scope: 'public_repo'
})

githubOAuth.on('error', function(err) {
  console.error('there was a login error', err)
})

app.get('/login', function(req, res) {
  res.cookie('github-redirect', req.headers.referer);
  return githubOAuth.login(req, res);
});

app.get('/callback', function(req, res) {
  githubOAuth.callback(req, res, function(err, result) {
    if (err) return res.json(err)
    
    res.cookie('github-token', result.access_token);
    var redirect = req.cookies['github-redirect'];
    if (redirect)
      return res.redirect(redirect);
    return res.redirect('/');
  });
});
/* end GitHub OAuth */

app.get('/:userId', function(req, res) {
  res.render('profile', {userId: req.params.userId});
});

app.get('/', function (req, res) {
  //res.send('GET request to the homepage');
  res.render('home');
});

app.use('/api/v1', router);

var where_query = 'WHERE actor_login = ? AND created_at >= ?';

router.get('/user/:userId/events/:startDate', function (req, res) {
  
  var limit = 5,
      current_page = req.query.page,
      repo_id = req.query.repo_id,
      resp = {};
  if (!current_page)
    current_page = 1;
  var offset = (current_page - 1) * limit,
      original_url = req.baseUrl + require('url').parse(req.url).pathname;

  if (repo_id)
    where_query += ' AND repo_id = '+ repo_id;

  async.parallel({
    data: function(callback) {
      connection.query('SELECT type,repo_id,payload,created_at FROM ?? ' + where_query +' ORDER BY created_at DESC LIMIT ? OFFSET ?', 
        [process.env.DATASET_NAME, req.params.userId, req.params.startDate, limit, offset], function(err, rows) {
          if (err) throw err;   
          callback(null, rows);
      });
    },
    total: function(callback) {
      connection.query('SELECT COUNT(id) AS total FROM ?? ' + where_query, 
        [process.env.DATASET_NAME, req.params.userId, req.params.startDate], function(err, rows) {
        callback(null, rows[0].total);
      });
    }
  }, function(err, result) {
    result.last_page = result.total > 0 ? Math.ceil(result.total / limit) : 1;
    result.current_page = current_page;

    result.next_page_url = original_url + '?page=' + (parseInt(current_page) + 1);
    if (result.current_page == result.last_page)
      result.next_page_url = null;

    result.prev_page_url = original_url + '?page=' + (parseInt(current_page) - 1);
    if (result.current_page == 1)
      result.prev_page_url = null;

    res.json(result);
  });
});

router.get('/user/:userId/repos/:startDate', function (req, res) {
    connection.query('SELECT repo_id FROM ?? '+ where_query +' GROUP BY repo_id', 
    	[process.env.DATASET_NAME, req.params.userId, req.params.startDate], function(err, rows) {
  		if (err) throw err;
      repoIds = [];
      async.each(rows, function(row, cb) {
        repoIds.push(row.repo_id); cb();
      }, function(err) {
        res.json(repoIds);
      });
	});
});

app.listen(3000);