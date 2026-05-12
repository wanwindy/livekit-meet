# Hong Kong LiveKit Test Deployment

Updated: 2026-05-06

## Sensitive Notice

This document describes the Hong Kong test environment. Server credentials and LiveKit secrets must stay in the password manager or deployment environment variables, not in the repository.

## Server Access

- Server role: Hong Kong test host
- Public IP: `103.207.68.248`
- SSH user: `root`
- SSH password: stored outside this repository
- OS: `Debian GNU/Linux 12 (bookworm)`

## Existing Services

The host was already running these services before LiveKit deployment:

- `hula-server`
- `nginx`
- `redis`
- `mysql`
- `srs`
- `jenkins`

`jitsi-meet` was stopped and its active configuration was removed on 2026-05-06 because the meeting stack moved to LiveKit.

Removed Jitsi paths:

- `/opt/jitsi/docker-jitsi-meet-master`
- `/root/.jitsi-meet-cfg`

Released Jitsi ports:

- `10000/udp`
- `15222/tcp`
- `127.0.0.1:8000`
- `127.0.0.1:8443`

## LiveKit Test Deployment

- Deployment type: single-node test deployment
- Docker container name: `livekit-test`
- LiveKit version: `1.11.0`
- Remote deployment path: `/opt/livekit-test`
- Routing mode: `single-node routing`

## Public Endpoints

- Production signal URL: `wss://fangxinbanmeet.com`
- Production token service: `https://fangxinbanmeet.com`
- Internal signal URL: `ws://103.207.68.248:17880`
- RTC TCP fallback: `103.207.68.248:17881/tcp`
- RTC UDP mux: `103.207.68.248:52000/udp`
- TURN/STUN UDP: `103.207.68.248:3479/udp`
- Internal token service: `http://103.207.68.248:17882`

## Domain And TLS

- Domain: `fangxinbanmeet.com`
- DNS A record: `fangxinbanmeet.com -> 103.207.68.248`
- TLS certificate path: `/www/server/panel/vhost/cert/fangxinbanmeet.com/fullchain.pem`
- TLS key path: `/www/server/panel/vhost/cert/fangxinbanmeet.com/privkey.pem`
- Nginx config: `/www/server/panel/vhost/nginx/fangxinbanmeet.com.conf`
- Nginx LiveKit migration backup: `/www/server/panel/vhost/nginx/fangxinbanmeet.com.conf.bak.livekit-20260506-2119`

Nginx routes:

- `https://fangxinbanmeet.com/api/* -> http://127.0.0.1:17882/api/*`
- `https://fangxinbanmeet.com/health -> http://127.0.0.1:17882/health`
- `wss://fangxinbanmeet.com/rtc -> http://127.0.0.1:17880/rtc`

## Token Service

- Deployment path: `/opt/livekit-token-service`
- Docker container name: `livekit-token`
- Public port: `17882/tcp`
- Rooms registry: `/opt/livekit-token-service/data/rooms.json`
- Compose file: `/opt/livekit-token-service/docker-compose.yaml`

APIs:

- `GET /health`
- `POST /api/meetings/create`
- `POST /api/meetings/join`

Example create request:

```bash
curl -sS -H "Content-Type: application/json" \
  -d '{"hostAccount":"host","displayName":"host"}' \
  https://fangxinbanmeet.com/api/meetings/create
```

Example join request:

```bash
curl -sS -H "Content-Type: application/json" \
  -d '{"meetingNumber":"123456","displayName":"guest"}' \
  https://fangxinbanmeet.com/api/meetings/join
```

## LiveKit Credentials

- API key: `lk_hk_test`
- API secret: stored outside this repository

## Remote Files

- Config: `/opt/livekit-test/livekit.yaml`
- Compose file: `/opt/livekit-test/docker-compose.yaml`
- Remote note: `/opt/livekit-test/README.txt`

## Current Config Summary

- HTTP port: `17880`
- RTC TCP port: `17881`
- RTC UDP port: `52000`
- TURN UDP port: `3479`
- `use_external_ip: false`
- `node_ip: 103.207.68.248`

## Why These Ports

The host had important ports in use during the initial test deployment, including:

- `80` and `443` by `nginx`
- `10000/udp` by `jitsi` before it was removed
- `1935`, `1985`, `1989`, `61100-61200/udp` by `srs`

To avoid service impact, LiveKit was placed on separate high ports.

## Verification Results

LiveKit was verified on 2026-04-25 with these checks:

- `livekit-test` container started successfully
- `docker logs` showed LiveKit server startup and TURN startup
- `17880/tcp` reachable from public network
- `17881/tcp` reachable from public network
- `http://103.207.68.248:17880/` returned `HTTP/1.1 200 OK`

Token service was verified on 2026-05-06 with these checks:

- `livekit-token` container started successfully
- `17882/tcp` reachable from public network
- `GET https://fangxinbanmeet.com/health` returned `status: ok`
- `POST /api/meetings/create` returned a meeting number and token
- `POST /api/meetings/join` returned a participant token for that meeting number
- `wss://fangxinbanmeet.com/rtc` opened successfully with a generated LiveKit token

## Common Operations

SSH to the server and use:

```bash
cd /opt/livekit-test
docker compose ps
docker compose logs --tail 200
docker compose restart
docker compose down
docker compose up -d
```

Check listening ports:

```bash
ss -lntup | egrep "17880|17881|3479|52000"
```

View the current config:

```bash
cat /opt/livekit-test/livekit.yaml
```

Token service operations:

```bash
cd /opt/livekit-token-service
DOCKER_API_VERSION=1.41 docker compose ps
DOCKER_API_VERSION=1.41 docker compose logs --tail 200
DOCKER_API_VERSION=1.41 docker compose restart
```

## Important Limitations

- This is still a test deployment, not a production deployment.
- App-facing API and signaling now use `https://` and `wss://` through `443`.
- Media transport still uses direct LiveKit UDP/TCP ports.
- It does not yet provide `TURN/TLS` on `443`.
- It is a single-node setup and not yet multi-region or high-availability.

## Recommended Next Steps

1. Replace the temporary token service auth with the real account system.
2. Add `TURN/TLS` on `443` for stricter enterprise and cross-border networks.
3. Build the production architecture as `Hong Kong primary + Singapore secondary`.
4. Add room-region selection before multi-region production rollout.
5. Add monitoring, backups, and alerting before business production use.
