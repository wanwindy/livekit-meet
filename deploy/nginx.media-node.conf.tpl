server {
  listen 80;
  server_name {{LIVEKIT_DOMAIN}};
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name {{LIVEKIT_DOMAIN}};

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
    proxy_buffering off;
    proxy_read_timeout 75s;
  }
}
