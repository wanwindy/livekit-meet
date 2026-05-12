# LiveKit Multi-Node Deployment Notes

This folder contains deployment templates for the next stage:

- Hong Kong control plane and primary media node.
- Singapore secondary media node.
- Ningbo mainland server as a measured pilot node only after domain, ICP, firewall, and compliance checks are confirmed.

Do not commit real passwords, LiveKit API secrets, Redis passwords, database passwords, TLS keys, or SSH credentials.

## Target Roles

| Server | Public IP | Initial role |
| --- | --- | --- |
| Hong Kong | `103.207.68.248` | Nginx, admin web, control API, MySQL, Redis, HK LiveKit |
| Singapore | `45.77.250.78` | SG LiveKit, SG TURN |
| Ningbo | `114.66.11.182` | Mainland probe/monitoring first; LiveKit/TURN only after compliance approval |

## Required DNS

Create these A records before production TLS:

| Domain | Target |
| --- | --- |
| `api.fangxinbanmeet.com` | Hong Kong |
| `admin.fangxinbanmeet.com` | Hong Kong |
| `hk.livekit.fangxinbanmeet.com` | Hong Kong |
| `turn-hk.fangxinbanmeet.com` | Hong Kong |
| `sg.livekit.fangxinbanmeet.com` | Singapore |
| `turn-sg.fangxinbanmeet.com` | Singapore |

Add Ningbo domains only after compliance approval.

## Rollout Order

1. Deploy `control-plane` on Hong Kong as `127.0.0.1:17883` first, leaving the current temporary token service on `17882`.
2. Add `api.fangxinbanmeet.com` and proxy it to `127.0.0.1:17883`.
3. Build `admin-web` and serve the static `dist` directory from Nginx under `admin.fangxinbanmeet.com` after backing up the old Jitsi admin config.
4. Register HK and SG nodes in the admin console.
5. Convert the existing HK LiveKit config to Redis-backed distributed mode.
6. Deploy Singapore LiveKit with the same Redis endpoint and API key/secret.
7. Test meeting creation with HK preferred, SG preferred, and HK offline fallback.
8. Add TURN/TLS 443 after basic distributed routing is stable.

## Control Plane

Use `docker-compose.control-plane.yml` as the base. Copy `control-plane/.env.example` to a real `.env` on the Hong Kong server and fill secrets there.

Bootstrap only the first admin account through environment variables:

```bash
AUTO_MIGRATE=true
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=<temporary-password>
```

After first login, change the password and remove `ADMIN_BOOTSTRAP_PASSWORD`.

## Media Nodes

Use `livekit-node.yaml.tpl` for each media node. Replace:

- `{{NODE_NAME}}`
- `{{NODE_IP}}`
- `{{REGION}}`
- `{{REDIS_ADDRESS}}`
- `{{REDIS_PASSWORD}}`
- `{{LIVEKIT_API_KEY}}`
- `{{LIVEKIT_API_SECRET}}`
- `{{TURN_DOMAIN}}`

For the first production-like test, keep rooms on HK by default and use Singapore as selectable fallback.
