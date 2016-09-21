
## GitHub-Activity
 
Some peoples use GitHub profile as resume. But I think it doesn't truly show your open-source contributions. Other activities which I think should be counted are;

* Any type of comments,
* All type of issue event,
* All type of pull request event

### Importing data

#### BigQuery

Instead of importing directly from [Github Archive](http://githubarchive.org), we are using Google BigQuery because there is too much event which we don't need, and plus we can take advantage of free tier pricing which is free for first 1TB data processed per month. We only used up around 700GB for one year of query, and 15GB for daily query.

#### Cloud Storage

We have to export to Google Storage first before we can download, for no particular reason, ask Google.

Too bad there is no free tier for this, so we have to download all files as soon as the export is done to minimize our cost.

#### MariaDB

Database size is around 350GB.

### Installation

1. `git clone https://github.com/natsu90/gh-activity.git`
2. `cd gh-activity && npm install`
3. Create Google Developer Credential file, https://github.com/GoogleCloudPlatform/google-cloud-node#elsewhere 
4. Create new application, https://github.com/settings/developers
5. `cp .env.sample .env`, then edit the file with gotten details
6. `node cli/scheduled.js` OR `node cli/import-cli.js --from=2016-09-21 --to=2016-09-21` to start seeding data
7. `npm start`
