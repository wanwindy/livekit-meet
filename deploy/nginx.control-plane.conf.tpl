server {
  listen 443 ssl http2;
  server_name api.fangxinbanmeet.com;

  ssl_certificate     {{TLS_FULLCHAIN}};
  ssl_certificate_key {{TLS_PRIVKEY}};

  location / {
    proxy_pass http://127.0.0.1:17882;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 443 ssl http2;
  server_name admin.fangxinbanmeet.com;

  ssl_certificate     {{TLS_FULLCHAIN}};
  ssl_certificate_key {{TLS_PRIVKEY}};

  root {{ADMIN_WEB_DIST}};
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 443 ssl http2;
  server_name hk.livekit.fangxinbanmeet.com;

  ssl_certificate     {{TLS_FULLCHAIN}};
  ssl_certificate_key {{TLS_PRIVKEY}};

  location / {
    proxy_pass http://127.0.0.1:7880;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

