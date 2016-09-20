
var appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});
var argv = require('minimist')(process.argv.slice(2)),
	async = require('async'),
	moment = require('moment'),
	mysql = require('mysql'),
	timeline = require('../github/github-timeline')
	(
		process.env.GOOGLE_PROJECT_ID, 
		process.env.GOOGLE_PROJECT_KEY_FILE,
		{
			datasetName: process.env.DATASET_NAME,
			bucketName: process.env.BUCKET_NAME,
			debug: true,
			//tableSqlFile: '../sql/table.sql',
			//bigQuerySqlFile: '../sql/bigquery.sql'
		}
	),
	dbDetail = {
		host     		: process.env.DB_HOST,
		user     		: process.env.DB_USER,
		password 		: process.env.DB_PASS,
		database 		: process.env.DB_NAME,
		charset         : 'utf8mb4'
	};

var connection = mysql.createConnection(dbDetail),
	endTime = moment().utc(),
	startTime = moment().utc().subtract(1, 'year'),
	format = 'YYYY-MM-DD';

connection.query("SELECT created_at FROM ?? ORDER BY created_at DESC LIMIT 1", [process.env.DATASET_NAME], 
	function(err, rows) {
	if (err) throw err;

	if (typeof rows[0] !== 'undefined')
		startTime = moment(rows[0].created_at);

	timeline.importQuery(startTime.format(format), endTime.format(format), dbDetail, function(err) {

		if (err) throw err;
		console.log('import done');
		process.exit(0);
	});

	connection.query("DELETE FROM ?? WHERE created_at < ? ", 
		[process.env.DATASET_NAME, endTime.subtract(1, 'year').format("YYYY-MM-DD HH:mm:ss")],
		function(err, rows) {
			if (err) throw err;
	});
});