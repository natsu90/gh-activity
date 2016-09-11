
## Install Webserver

### Install

`sudo apt-get update`

`sudo apt-get upgrade`

`sudo apt-get install nodejs npm nginx git supervisor letsencrypt mariadb-client`

`ln -s /usr/bin/nodejs /usr/bin/node`

### Supervisor

`sudo vi /etc/supervisor/conf.d/gh-activity.conf`

```
[program:github-activity]
command=node index.js
directory=/root/github-activity
autostart=true
autorestart=true
stderr_logfile=/var/log/gh-activity.err.log
stdout_logfile=/var/log/gh-activity.out.log
```

`sudo service supervisor start`

`sudo supervisorctl reread`

`sudo supervisorctl update`

`sudo supervisorctl reload`

### Nginx