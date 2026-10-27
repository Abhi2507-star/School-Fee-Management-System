# Security & Optional Remote Access Architecture

## 1. Local & Network Security Controls
- **Database Isolation**: PostgreSQL listens exclusively on `127.0.0.1:5432` (`listen_addresses = 'localhost'` in `postgresql.conf`) and is never exposed to the LAN or internet.
- **Individual Staff Accounts & RBAC**: Every Administrator, Accountant, Cashier, and Auditor has an individual account. Every API route enforces role permissions on the server.
- **Password & Session Security**: Passwords are hashed using Argon2id/scrypt with timing-safe verification. Login throttling locks an account for 15 minutes after 5 failed attempts.
- **Financial Immutability**: PostgreSQL triggers (`prevent_financial_record_deletion`) block `DELETE` statements on `payments`, `receipts`, and `audit_logs`.

## 2. Optional Zero-Cost Remote Access via Tailscale Private VPN
- When the school Principal or Accountant needs occasional access from home:
  1. Install **Tailscale** (free personal/small-team plan) on the school Windows server and on the authorized remote laptop/phone.
  2. Enable **Tailscale HTTPS Certificates** (`tailscale serve https / http://127.0.0.1:3000`).
  3. Add the Tailscale MagicDNS origin to `ALLOWED_ORIGINS` in `.env`.
- **Important Operational Limitation**: Remote access requires the school computer to be powered on and connected to the internet (e.g., broadband or mobile hotspot). Local office fee collection continues uninterrupted even when the internet or VPN is offline. Never configure router port forwarding.
