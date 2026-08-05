# CampusFix AI HelpDesk

CampusFix is a complete university IT support system built for the course requirements. Students and faculty submit problems, technicians claim and resolve them, and administrators manage roles. Microsoft Entra ID supplies university identity, CampusFix issues its own JWT for RBAC, Gemini classifies tickets, and a protected Peer API exchanges data with a classmate's project.

## Included code

```text
CampusFix/
├── backend/
│   ├── prisma/
│   │   ├── migrations/              # Real MySQL migration
│   │   └── schema.prisma            # Database and relationships
│   └── src/
│       ├── middleware/              # JWT, roles, errors
│       ├── routes/                  # Auth, tickets, users, peer, health
│       ├── services/                # Gemini and partner API
│       ├── config.js                # Azure Key Vault
│       └── server.js                # Express API
├── frontend/
│   └── src/                         # React application and MSAL login
├── deployment/                      # Nginx, systemd, bootstrap example
├── scripts/deploy.sh                # Automated deployment
└── docs/                            # Proposal, ERD, Peer API, demo, checklist
```

## Architecture

```text
University user
    │ HTTPS
    ▼
Nginx on Azure Ubuntu VM
    ├── /campusfix/       → React files
    └── /campusfix/api/   → Express on 127.0.0.1:3100
                                ├── Microsoft Entra ID
                                ├── Azure Key Vault
                                ├── MySQL through Prisma
                                ├── Gemini API
                                └── Classmate Peer API
```

Ports `3100` and `3306` must not be publicly opened.

## 1. Azure VM and network

Use Ubuntu 24.04 on the `project-1` VM. In Azure Network Settings, allow:

| Port | Source | Purpose |
|---:|---|---|
| 22 | Your IP | SSH |
| 80 | Any | HTTP and certificate validation |
| 443 | Any | HTTPS |

Set the public IP to Static and use this DNS label:

`project-1-backend.eastasia.cloudapp.azure.com`

Connect from your Mac Terminal using the username and key shown in Azure Portal → VM → Connect:

```bash
chmod 400 ~/Downloads/project-1_key.pem
ssh -i ~/Downloads/project-1_key.pem azureuser@40.83.72.112
```

Replace the username, IP, and key filename with the real values shown by Azure.

## 2. Install server software

Run on the VM:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates build-essential nginx mysql-server ufw fail2ban unattended-upgrades certbot python3-certbot-nginx rsync
sudo systemctl enable --now nginx mysql fail2ban
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Configure the VM firewall:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 3. Create the MySQL database

Generate a password containing only hexadecimal characters, which avoids URL-encoding problems:

```bash
openssl rand -hex 24
sudo mysql
```

Inside MySQL, replace `YOUR_RANDOM_HEX_PASSWORD`:

```sql
CREATE DATABASE campusfix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'campusfix_user'@'localhost' IDENTIFIED BY 'YOUR_RANDOM_HEX_PASSWORD';
CREATE USER 'campusfix_user'@'127.0.0.1' IDENTIFIED BY 'YOUR_RANDOM_HEX_PASSWORD';

GRANT ALL PRIVILEGES ON campusfix.* TO 'campusfix_user'@'localhost';
GRANT ALL PRIVILEGES ON campusfix.* TO 'campusfix_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

The Key Vault database URL will be:

```text
mysql://campusfix_user:YOUR_RANDOM_HEX_PASSWORD@127.0.0.1:3306/campusfix
```

## 4. Create Microsoft Entra applications

Create two single-tenant app registrations in the university tenant.

### CampusFix-API

1. Microsoft Entra ID → App registrations → New registration.
2. Name: `CampusFix-API`.
3. Account type: accounts in this organizational directory only.
4. Expose an API → set Application ID URI to `api://API_CLIENT_ID`.
5. Add delegated scope `access_as_user`; allow admins and users to consent if your tenant permits it.
6. Copy the **Application (client) ID** and **Directory (tenant) ID**.

### CampusFix-Frontend

1. Create `CampusFix-Frontend` as a single-tenant registration.
2. Authentication → Add a platform → Single-page application.
3. Add both redirect URIs:

```text
http://localhost:5173/campusfix/
https://project-1-backend.eastasia.cloudapp.azure.com/campusfix/
```

4. API permissions → My APIs → CampusFix-API → Delegated permissions → `access_as_user`.
5. Ask the university administrator for consent if the consent button is disabled.

Open `frontend/src/config.js` and replace:

```text
PASTE_DIRECTORY_TENANT_ID_HERE
PASTE_FRONTEND_CLIENT_ID_HERE
PASTE_API_CLIENT_ID_HERE
```

The API client ID appears twice and must be identical in both places. These IDs are public identifiers, not passwords.

## 5. Create and authorize Azure Key Vault

If your teacher supplied a centralized Class Key Vault, use it. Otherwise, create a development vault using Azure RBAC.

1. Enable `project-1` VM → Identity → System assigned → On.
2. Key Vault → Access control (IAM) → assign the VM **Key Vault Secrets User**.
3. Give your own account **Key Vault Secrets Officer** so you can create secret values.

Create these exact secret names:

| Secret | Required? | Value |
|---|---|---|
| `CampusFix-DatabaseUrl` | Yes | MySQL URL from step 3 |
| `CampusFix-JwtSecret` | Yes | Output of `openssl rand -hex 64` |
| `CampusFix-AdminEmails` | Recommended | Your university email; comma-separate multiple admins |
| `CampusFix-GeminiApiKey` | Optional initially | Real Gemini key |
| `CampusFix-GeminiModel` | Optional | `gemini-2.5-flash` |
| `CampusFix-PeerInboundApiKey` | Required for inbound Peer API | Output of `openssl rand -hex 32`; give to partner |
| `CampusFix-PeerOutboundApiKey` | Required for partner lookup | Key received from partner |
| `CampusFix-PeerBaseUrl` | Required for partner lookup | Partner API base URL, without final slash |

Never send the real values in chat, screenshots, GitHub, or the frontend source.

## 6. Create the VM bootstrap configuration

The bootstrap file contains identifiers and the Key Vault address, not production secret values.

```bash
sudo mkdir -p /etc/campusfix
sudo nano /etc/campusfix/bootstrap.conf
```

Paste and replace each placeholder:

```text
NODE_ENV=production
PORT=3100
APP_BASE_PATH=/campusfix
KEY_VAULT_URL=https://YOUR-VAULT-NAME.vault.azure.net/
ENTRA_TENANT_ID=YOUR_DIRECTORY_TENANT_ID
ENTRA_CLIENT_ID=YOUR_CAMPUSFIX_API_CLIENT_ID
CORS_ORIGINS=https://project-1-backend.eastasia.cloudapp.azure.com
```

Protect it:

```bash
sudo chown root:root /etc/campusfix/bootstrap.conf
sudo chmod 600 /etc/campusfix/bootstrap.conf
```

## 7. Put the source on the VM

Upload the project to your GitHub repository first, then on the VM:

```bash
cd /srv
sudo git clone https://github.com/Swanyiwinthuya/project1-BAD.git
sudo chown -R "$USER":"$USER" /srv/project1-BAD
cd /srv/project1-BAD
```

If the repository is private, use a GitHub-supported authenticated method. Do not put a GitHub password or token directly in a saved command or project file.

## 8. Deploy automatically

From the project root on the VM:

```bash
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

The script installs project dependencies, generates Prisma Client, runs the migration, builds React, installs the systemd service, installs the Nginx site, and starts CampusFix.

Check the API:

```bash
curl http://127.0.0.1:3100/campusfix/api/health
sudo systemctl status campusfix --no-pager
sudo journalctl -u campusfix -n 100 --no-pager
```

Then check publicly:

```text
http://project-1-backend.eastasia.cloudapp.azure.com/campusfix/api/health
```

## 9. Enable HTTPS

After DNS resolves to the VM and HTTP works:

```bash
sudo certbot --nginx -d project-1-backend.eastasia.cloudapp.azure.com
sudo certbot renew --dry-run
```

Open:

`https://project-1-backend.eastasia.cloudapp.azure.com/campusfix/`

Update the Microsoft SPA redirect URI if your real DNS name differs.

## Local development

For development only, copy `backend/.env.example` to `backend/.env`, set `DEV_AUTH_BYPASS=true`, and load the values into your shell before starting. Production must use Key Vault.

Install and run:

```bash
npm install --workspaces
set -a
source backend/.env
set +a
npm run prisma:generate --workspace backend
npm run dev:backend
npm run dev:frontend
```

The frontend runs at `http://localhost:5173/campusfix/`. The Vite proxy forwards API requests to port 3100.

## API summary

| Method | Path | Access |
|---|---|---|
| GET | `/campusfix/api/health` | Public |
| POST | `/campusfix/api/auth/exchange` | Microsoft token |
| GET/POST | `/campusfix/api/tickets` | Signed-in user |
| POST | `/campusfix/api/tickets/:id/comments` | Owner or support staff |
| PATCH | `/campusfix/api/tickets/:id` | Technician/Admin |
| GET/PATCH | `/campusfix/api/users` | Admin |
| POST | `/campusfix/api/peer/tickets` | Partner `x-api-key` |

See `docs/PEER_API.md` for the request and response formats.

## Troubleshooting

### Key Vault error

Confirm the VM managed identity is On, it has **Key Vault Secrets User**, the vault URL is correct, and the two required secret names match exactly. Role assignments may take several minutes to apply.

### Microsoft sign-in error

Confirm the tenant ID, both client IDs, SPA redirect URI, exposed scope, delegated permission, and tenant consent. Never use the Object ID instead of the Application client ID.

### Nginx shows 502

The API service is not available. Run:

```bash
sudo systemctl status campusfix --no-pager
sudo journalctl -u campusfix -n 100 --no-pager
```

### Prisma cannot connect

Check MySQL status and the `CampusFix-DatabaseUrl` secret:

```bash
sudo systemctl status mysql --no-pager
mysql -h 127.0.0.1 -u campusfix_user -p campusfix
```

## Stop Azure charges safely

When finished, use Azure Portal → Virtual machines → `project-1` → Stop. Wait for the exact state **Stopped (deallocated)**. The disk and other retained resources can still have small charges.

## Final submission files

- Proposal: `docs/PROPOSAL.md`
- ERD: `docs/ERD.mmd`
- Peer API documentation: `docs/PEER_API.md`
- Video plan: `docs/VIDEO_DEMO_SCRIPT.md`
- Course checklist: `docs/REQUIREMENTS_CHECKLIST.md`
