# Hong Kong Phase 1 Runbook

Updated: 2026-05-07

## Current Findings

Read-only checks on 2026-05-07 showed:

- `fangxinbanmeet.com` points to Hong Kong and `/health` is healthy.
- `admin.fangxinbanmeet.com` points to Hong Kong, but currently serves the old Jitsi admin backend through `127.0.0.1:8889`.
- `api.fangxinbanmeet.com`, `hk.livekit.fangxinbanmeet.com`, `sg.livekit.fangxinbanmeet.com`, `turn-hk.fangxinbanmeet.com`, and `turn-sg.fangxinbanmeet.com` are not yet in DNS.
- Hong Kong already uses ports `17880`, `17881`, `17882`, `3479/udp`, and `52000/udp` for the current LiveKit test and temporary token service.
- Hong Kong MySQL and Redis are Docker containers, not system services. MySQL is published on `13306`; Redis is published on `16379`.
- Singapore has Docker and Compose available, but no Nginx installed. Port `80` is already used by an `nginx:alpine` download container.

## Safe Phase 1 Strategy

Do not replace the current `fangxinbanmeet.com/api/*` token service immediately.

Instead:

1. Deploy the new control plane on Hong Kong as `127.0.0.1:17883`.
2. Point `api.fangxinbanmeet.com` to Hong Kong.
3. Add an Nginx server block for `api.fangxinbanmeet.com -> 127.0.0.1:17883`.
4. Build and stage the new admin web under `/www/wwwroot/livekit-admin`.
5. Replace `admin.fangxinbanmeet.com` only after backing up its current config and confirming the old Jitsi admin is no longer needed.
6. Create the first admin user, create host accounts, and test mobile login/device binding against the new API.
7. After mobile API compatibility is confirmed, switch `fangxinbanmeet.com/api/*` from `17882` to `17883`.

## DNS To Add Before Switching

| Record | Target |
| --- | --- |
| `api.fangxinbanmeet.com` | `103.207.68.248` |
| `hk.livekit.fangxinbanmeet.com` | `103.207.68.248` |
| `sg.livekit.fangxinbanmeet.com` | `45.77.250.78` |
| `turn-hk.fangxinbanmeet.com` | `103.207.68.248` |
| `turn-sg.fangxinbanmeet.com` | `45.77.250.78` |

## Hong Kong Control Plane Environment

Use a server-only `.env`; do not commit it.

Key values:

```bash
PORT=17883
PUBLIC_BASE_URL=https://api.fangxinbanmeet.com
MYSQL_HOST=127.0.0.1
MYSQL_PORT=13306
MYSQL_DATABASE=livekit_control
LIVEKIT_DEFAULT_REGION=hk
LIVEKIT_SIGNAL_HK=wss://fangxinbanmeet.com
LIVEKIT_SIGNAL_SG=wss://sg.livekit.fangxinbanmeet.com
AUTO_MIGRATE=true
```

Use a new MySQL user for `livekit_control`. Use a newly generated `JWT_SECRET`.

## Cutover Checklist

1. Back up Nginx configs:

```bash
cp /www/server/panel/vhost/nginx/fangxinbanmeet.com.conf /www/server/panel/vhost/nginx/fangxinbanmeet.com.conf.bak.control-plane-$(date +%Y%m%d-%H%M)
cp /www/server/panel/vhost/nginx/admin.fangxinbanmeet.com.conf /www/server/panel/vhost/nginx/admin.fangxinbanmeet.com.conf.bak.control-plane-$(date +%Y%m%d-%H%M)
```

2. Start the new API on `127.0.0.1:17883`.
3. Verify:

```bash
curl -sS http://127.0.0.1:17883/health
curl -sS https://api.fangxinbanmeet.com/health
```

4. Log in to the admin console and create a host account.
5. Test mobile host login, device bind, create meeting, and join meeting.
6. Only then switch existing `fangxinbanmeet.com/api/*` traffic to the new control plane.

## Rollback

If the new API fails after switching:

1. Restore the backed up `fangxinbanmeet.com.conf`.
2. Run `nginx -t`.
3. Reload Nginx.
4. Keep the old `livekit-token` container running until mobile compatibility is fully verified.

