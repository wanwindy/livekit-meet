# LiveKit Multi-Node Admin Implementation

Updated: 2026-05-06

## What Was Added

- `control-plane`: Express API for admin login, account CRUD, device bind/unbind/block, meeting creation/joining, node status, and audit logs.
- `admin-web`: React/Vite management console for accounts, devices, LiveKit nodes, recent meetings, and audit logs.
- `deploy`: Docker Compose and Nginx/LiveKit templates for Hong Kong and Singapore rollout.
- Mobile client integration for real host login and device-bound meeting creation.

## Runtime API Summary

Admin:

- `POST /admin/auth/login`
- `GET /admin/accounts`
- `POST /admin/accounts`
- `PATCH /admin/accounts/:id`
- `POST /admin/accounts/:id/reset-password`
- `POST /admin/devices/:id/unbind`
- `POST /admin/devices/:id/block`
- `GET /admin/nodes`
- `POST /admin/nodes`
- `PATCH /admin/nodes/:id`
- `GET /admin/audit-logs`

Mobile:

- `POST /api/auth/login`
- `POST /api/devices/bind`
- `POST /api/devices/heartbeat`
- `POST /api/meetings/create`
- `POST /api/meetings/join`
- `GET /api/config`

## Region Policy

Default policy:

- China-facing and unspecified meetings: Hong Kong.
- Southeast Asia audience hint: Singapore.
- If the preferred region has no `healthy` or `degraded` node, the API falls back to the next available node.

Important LiveKit constraint:

- Existing rooms cannot be moved between nodes. Failover only applies to newly created meetings.

## Database

Create a MySQL database and user, then apply:

```bash
mysql -u livekit_control -p livekit_control < control-plane/src/schema.sql
```

For first boot only, `AUTO_MIGRATE=true` can apply the schema automatically.

## Local Development

```bash
npm install
npm run test -w control-plane
npm run dev -w control-plane
npm run dev -w admin-web
```

Set `VITE_API_BASE=http://127.0.0.1:17882` when running the admin web separately from the API.

## Production Notes

- Store secrets only in server `.env` files or a password manager.
- Rotate any secrets that were previously placed in local docs or chat.
- Restrict Redis to private IPs or SSH/VPN tunnels; do not expose unauthenticated Redis publicly.
- Add node records in the admin console before routing mobile users to new regions.
- Keep Ningbo in probe/monitoring mode until compliance and domain requirements are confirmed.

