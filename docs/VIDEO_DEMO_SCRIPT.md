# 10-Minute Demonstration Script

1. **0:00–0:45 — Introduction:** explain the CampusFix problem, users, and public HTTPS URL.
2. **0:45–2:00 — Architecture:** show React → Nginx → Express → Prisma/MySQL, plus Entra, Key Vault, Gemini, and Peer API.
3. **2:00–3:15 — Identity and RBAC:** sign in with Microsoft; show Student and Technician permissions.
4. **3:15–5:00 — Ticket flow:** create a ticket, show AI category/priority, add a comment, assign it, and resolve it.
5. **5:00–6:15 — Peer API:** call the protected inbound endpoint and show a partner room check making a ticket urgent.
6. **6:15–7:15 — Database:** show `prisma/schema.prisma` and the initial migration.
7. **7:15–8:15 — Secrets:** show secret names in Key Vault and `backend/src/config.js`; never reveal secret values.
8. **8:15–9:15 — Deployment and security:** show Nginx, HTTPS, systemd status, firewall, and closed ports 3100/3306.
9. **9:15–10:00 — Summary:** connect every demonstrated feature to the course checklist.

