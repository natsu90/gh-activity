
var path = require('path'),
	async = require('async'),
	fs = require('fs'),
	moment = require('moment'),
	zlib = require('zlib'),
	mysql = require('mysql'),
	appRoot = require('app-root-path'),

	gcloud, 
	datasetName = 'github_timeline', 
	bucketName = 'github-timeline',
	tableSqlFile = appRoot + '/sql/table.sql',
	bigQuerySqlFile = appRoot + '/sql/bigquery.sql',
	debug = false;

function Timeline(projectId, projectKeyFile, options) {

	gcloud = require('google-cloud')({
		projectId: projectId,
		keyFilename: projectKeyFile
	});

	if (typeof options.datasetName !== 'undefined')
		datasetName = options.datasetName;

	if (typeof options.bucketName !== 'undefined')
		bucketName = options.bucketName;

	if (typeof options.debug !== 'undefined')
		debug = options.debug;

	if (typeof options.tableSqlFile !== 'undefined')
		tableSqlFile = options.tableSqlFile;

	if (typeof options.bigQuerySqlFile !== 'undefined')
		bigQuerySqlFile = options.bigQuerySqlFile;

	return {
		importQuery: function(startDate, endDate, dbDetail, cb) {
			async.waterfall([
				function(callback) {
					startQuery(startDate, endDate, callback);
				},
				function(tableName, callback) {
					exportQuery(tableName, callback);
				},
				function(tableName, callback) {
					download(tableName, callback);
				},
				function(fileNames, callback) {
					importData(fileNames, dbDetail, callback);
				}
			], function(err) {
				if (err) cb(err);
				else cb(null);
			});
		},
		startQuery: function(startDate, endDate, callback) {
			return startQuery(startDate, endDate, callback);
		},
		exportQuery: function(tableName, callback) {
			return exportQuery(tableName, callback);
		},
		download: function(tableName, callback) {
			return download(tableName, callback);
		},
		importData: function(fileNames, dbDetail, callback) {
			return importData(fileNames, dbDetail, callback);
		},
		getTableSql: function(callback) {
			return getTableSql(callback);
		},
		seed: function(csvFile, dbDetail) {	
			var pool = mysql.createPool(dbDetail);
			// create table if not exist
			getTableSql(function(err, query) {

				if (err) throw err;
				pool.query(query, function(err) {
				    if (err) throw err;

					return seed(csvFile, pool, function() {
						pool.end();
						console.log('imported');
					});
				});
			});
		}
	};
}

function getTableSql(callback) {

	fs.readFile(tableSqlFile, 'utf8', function(err, query) {

		if (err) return callback(err);

		query = query.replace('#datasetName', datasetName);
		callback(null, query);
	});

}

function getBigQuerySql(startDate, endDate, callback) {

	startDate = moment(startDate).format('YYYY-MM-DD'), endDate = moment(endDate).format('YYYY-MM-DD');

	fs.readFile(bigQuerySqlFile, 'utf8', function(err, query) {

		if (err) return callback(err);

		query = query.replace('#startDate', startDate).replace('#endDate', endDate);
		callback(null, query);
	});
}

function getDataset(datasetName, callback) {

	bigquery = gcloud.bigquery();
	bigquery.createDataset(datasetName, function(err, dataset) {
		if (err) { 
			if (err.code == 409)
				return callback(null, bigquery.dataset(datasetName));
			return callback(err);
		}
		callback(null, dataset);
	});
}

function getBucket(bucketName, callback) {

	storage = gcloud.storage();
	storage.createBucket(bucketName, function(err, bucket) {
		if (err) {
			if (err.code == 409)
				return callback(null, bucket = storage.bucket(bucketName));
			return callback(err);
		}
		callback(null, bucket);
	});
}

function startQuery(startDate, endDate, callback) {

	startDate = moment(startDate), endDate = moment(endDate);
	tableName = startDate.format('YYYYMMDD');
	if (startDate.format('YYYYMMDD') !== endDate.format('YYYYMMDD'))
		tableName += '_'+endDate.format('YYYYMMDD');

	async.parallel({
		query: function(cb) {
			getBigQuerySql(startDate, endDate, cb);
		},
		table: function(cb) {
			getDataset(datasetName, function(err, dataset) {
				if (err) return cb(err);
				cb(null, dataset.table(tableName));
			});
		}
	}, function(err, result) {

		var query = result.query,
			table = result.table,
			bigquery = gcloud.bigquery();

		bigquery.startQuery({
			query: query,
			destination: table,
			allowLargeResults: true
		}, function(err, job) {
			if (err) return callback(err);
			var startTime = moment();
			if (debug) console.log('processing query..');

			job.on('complete', function(metadata) {
				if (debug) console.log('query completed: '+moment().diff(startTime)+'ms');
				callback(null, tableName);
			}).on('error', function(err) {
				callback(err);
			});
		});
	});
}

function exportQuery(tableName, callback) {

	async.parallel({
		table: function(cb) {
			getDataset(datasetName, function(err, dataset) {
				if (err) return cb(err);
				cb(null, dataset.table(tableName));
			});
		},
		file: function(cb) {
			getBucket(bucketName, function(err, bucket) {
				if (err) return cb(err);
				cb(null, bucket.file(tableName+'/data-*.csv.gz'));
			});
		}
	}, function(err, result) {

		var table = result.table,
			file = result.file;

		table.export(file, {
			format: 'csv',
			gzip: true
		}, function(err, job, apiResponse) {
			if (err) return callback(err);
			var startTime = moment();
			if (debug) console.log('uploading..');

			job.on('complete', function(metadata) {
				// delete dataset table
				table.delete(function(err) {
					if (err) return callback(err);
					if (debug) console.log('dataset table deleted');
				})
				if (debug) console.log('uploaded: '+moment().diff(startTime)+'ms');
				callback(null, tableName);
			}).on('error', function(err) {
				return callback(err);
			});
		});
	});
}

function download(tableName, callback) {

	var fileNames = [];

	getBucket(bucketName, function(err, bucket) {
		if (err) return callback(err);

		bucket.getFiles({
			prefix: tableName,
			maxResults: 1000
		}, function(err, files) {
			if (err) return callback(err);

			var startTimes = moment();
			async.eachLimit(files, 5, function(file, cb) {

				var file_name = path.basename(file.name),
					startTime = moment();

				if (debug) console.log('downloading.. '+file_name);

				file.download({
			      destination: file_name
			    }, function(err) {

			    	if (err) return cb(err);
			    	
		        	if (debug) console.log('downloaded '+ file_name +' '+moment().diff(startTime)+'ms');
		        	file.delete(function(err) {
		        		if (err) return cb(err);

		        		if (debug) console.log('storage file deleted');
		        		fileNames.push(file_name); 
		        		cb();
		        	});
			  	});
			}, function(err) {
				if (err) return callback(err);

				if (debug) console.log('all downloaded: '+moment().diff(startTimes)+'ms');
				callback(null, fileNames);
			});
		});
	});
}

function importData(fileNames, dbDetail, callback) {

	var unzipStartTime = moment(),
		pool = mysql.createPool(dbDetail);

	async.waterfall([
		function(fn) {

			getTableSql(fn);
		},
		function(query, fn) {

			pool.query(query, function(err) {
		    	if (err) return fn(err);
		    	fn(null, true);
			});
		},
		function(success, fn) {

			async.eachLimit(fileNames, 2, function(gzipFile, cb) {

				var csvFile = path.basename(gzipFile, '.gz');
				fs.createReadStream(gzipFile)
				.on('error', function(err) {
					cb(err);
				})
				.pipe(zlib.createGunzip())
				.pipe(fs.createWriteStream(csvFile))
				.on('finish', function() {	
					if (debug) console.log('unzipped '+gzipFile);
					fs.unlinkSync(gzipFile);
					seed(csvFile, pool, cb);
				});

			}, function(err) {
				if( err ) return callback(err);
				pool.end();
				if (debug) console.log('all unzipped: '+moment().diff(unzipStartTime)+'ms');
				fn(null, true);
			});
		}
	], function(err) {
		if (err) return callback(err);
		callback(null, true)
	});
}

function seed(csvFile, pool, callback) {

	var seedStartTime = moment();

	pool.getConnection(function(err, connection) {

		if (err) return callback(err);

		connection.query("LOAD DATA LOCAL INFILE ? "+ 
			"IGNORE INTO TABLE ?? "+
			"FIELDS TERMINATED BY ',' "+
			"ENCLOSED BY '\"' "+
			"ESCAPED BY '\"' "+
			"LINES TERMINATED BY '\n' "+
			"IGNORE 1 LINES "+
			"(type,payload,repo_id,actor_login,created_at,id)", [path.resolve(csvFile), datasetName], function(err, result) {
				if (err) return callback(err);
				connection.release();
				if (debug) console.log(result.affectedRows +" rows inserted in "+ moment().diff(seedStartTime) +"ms");
				// delete file to clear some space
		        fs.unlinkSync(csvFile);
				callback();
			});
	});
}

module.exports = Timeline;