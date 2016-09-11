SELECT
	type,payload,repo.id,actor.login,created_at,id
FROM 
   (SELECT type,payload,repo.id,actor.login,created_at,id FROM TABLE_DATE_RANGE([githubarchive:day.], TIMESTAMP('#startDate'), TIMESTAMP('#endDate')))
WHERE 
   #actor.login = "natsu90" AND 
   #repo.url NOT LIKE CONCAT("%/",actor.login,"/%") AND 
   repo.id IN (SELECT repo.id FROM TABLE_QUERY(githubarchive:month, 'true') WHERE type="WatchEvent" GROUP BY 1 HAVING COUNT(*) >= 3) AND
   type IN ("CommitCommentEvent", "IssueCommentEvent", "IssuesEvent", "PullRequestEvent", "PullRequestReviewCommentEvent", "PushEvent")
#ORDER BY created_at desc