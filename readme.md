
## GH-Activity
 
Some peoples use his/her GitHub profile as resume. But I think it doesn't truly show your open-source contributions. The activities which I think should be counted are;

* Any type of comments,
* All type of issue event,
* All type of pull request event,
* Commits, 

in repositories with at least 3 stars, and within a year.

Or we can catch who is include a well-known repo in his contribution for a silly issue/pull request.

### Importing data

#### BigQuery

Instead of importing directly from [Github Archive](http://githubarchive.org), we are using Google BigQuery because there is too much event which we don't need, and plus we can take advantage of the free tier pricing which is free for first 1TB data processed per month. We only used up around 700GB for one year of query, and 15GB for daily query.

### Cloud Storage

We have to export to Google Storage first before we can download, for no particular reason, ask Google.

Too bad there is no free tier pricing for this, so we have to download all files as soon after the export and before we start the importing part.

### MariaDB

All data is around 400GB. I put a tutorial