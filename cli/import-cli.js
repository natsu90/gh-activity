
var appRoot = require('app-root-path');
require('dotenv').config({path: appRoot + '/.env'});
var argv = require('minimist')(process.argv.slice(2)),
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

/*timeline.seed(argv.file, dbDetail, function(err) {
	if (err) throw err;
	process.exit(0);
});*/

timeline.importQuery(argv.from, argv.to, dbDetail, function(err) {

	if (err) throw err;
	console.log('import done');
	process.exit(0);
});