
## Install Webserver

### Install

`sudo apt-get update`

`sudo apt-get upgrade`

`sudo apt-get install nodejs npm nginx git supervisor letsencrypt mariadb-client`

`ln -s /usr/bin/nodejs /usr/bin/node`

### Git

`ssh-keygen -t rsa -b 4096 -C "sulaiman@derp.com.my"`

`vi ~/.ssh/id_rsa.pub`, add to GitHub SSH Keys

`cd /var/www/html && git clone git@github.com:natsu90/gh-activity.git`

`cd gh-activity && npm install`

setup `.env` & `gcloud.json` file

`sudo crontab -e`

```
0 1 * * * /usr/bin/node /var/www/html/gh-activity/cli/scheduled.js
```

### Supervisor

`sudo vi /etc/supervisor/conf.d/gh-activity.conf`

```
[program:gh-activity]
command=node index.js
directory=/var/www/html/gh-activity
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

`sudo vi /etc/nginx/sites-available/gh-activity`

```
server {
	listen 80;

    access_log /var/log/nginx/gh-activity.access.log;
    error_log /var/log/nginx/gh-activity.error.log;

    server_name gh-activity.com;

    location / {
            proxy_pass http://localhost:3000;
    }
}
```

`ln -s /etc/nginx/sites-available/gh-activity /etc/nginx/sites-enabled/gh-activity`

`sudo service nginx restart`

### Letsencrypt

refs: https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04

`vi /etc/nginx/sites-available/gh-activity`

```
	location ~ /.well-known {
        allow all;
        root /var/www/html;
    }
```

`sudo nginx -t`

`sudo service nginx restart`

`sudo letsencrypt certonly -a webroot --webroot-path=/var/www/html -d gh-activity.com`

`sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048`

`sudo vi /etc/nginx/snippets/ssl-params.conf`

```
# from https://cipherli.st/
# and https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html

ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
ssl_prefer_server_ciphers on;
ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
ssl_ecdh_curve secp384r1;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
# Disable preloading HSTS for now.  You can use the commented out header line that includes
# the "preload" directive if you understand the implications.
#add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload";
add_header Strict-Transport-Security "max-age=63072000; includeSubdomains";
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;

ssl_dhparam /etc/ssl/certs/dhparam.pem;
```

`vi /etc/nginx/sites-available/gh-activity`

```
server {
    listen 80;

    server_name gh-activity.com;

    return 301 https://$server_name$request_uri;
}

server {
    
    listen 443 ssl http2;

    access_log /var/log/nginx/gh-activity.access.log;
    error_log /var/log/nginx/gh-activity.error.log;

    server_name gh-activity.com;

    ssl_certificate /etc/letsencrypt/live/gh-activity.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gh-activity.com/privkey.pem;
    include snippets/ssl-params.conf;

    location / {
        proxy_pass http://localhost:3000;
    }

    location ~ /.well-known {
        allow all;
        root /var/www/html;
    }
}
```

`sudo service nginx restart`

`sudo crontab -e`

```
30 2 * * 1 /usr/bin/letsencrypt renew >> /var/log/le-renew.log
35 2 * * 1 /bin/systemctl reload nginx
```

