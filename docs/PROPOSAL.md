# Project Proposal — CampusFix AI HelpDesk

**Student:** ____________________  
**Student ID:** ____________________  
**Partner:** ____________________  

## Domain and purpose

CampusFix is a university IT support portal. Students and faculty report classroom, network, account, hardware, and software problems. Technicians claim and resolve tickets, while administrators manage access and roles.

## Technology

The frontend uses React and Vite. The backend uses Node.js and Express. MySQL is managed by Prisma ORM migrations. The system runs on an Azure Ubuntu VM behind Nginx and Let's Encrypt HTTPS under `/campusfix/`.

## RBAC roles

| Role | Permission |
|---|---|
| Student | Create tickets, view own tickets, comment |
| Faculty | Create tickets, view own tickets, comment |
| Technician | View all tickets, assign, update, resolve |
| Administrator | Technician access plus user and role management |

Microsoft Entra ID authenticates university accounts. The backend then issues a CampusFix JWT containing the user's system role.

## Database

The main tables are Users, Tickets, Comments, AuditLogs, and PeerRequests. A user can request many tickets; a technician can be assigned many tickets; tickets have many comments and peer-request records. The full ERD is in `docs/ERD.mmd`.

## Third-party API

Gemini AI classifies each ticket into Hardware, Software, Network, Account Access, Audio Visual, or Other and recommends a priority. A keyword fallback allows ticket creation to continue when Gemini is unavailable.

## Peer API

CampusFix consumes a Campus Event Booking API to check whether an event is active in the reported room. An active event makes the ticket urgent. CampusFix exposes `POST /campusfix/api/peer/tickets`, protected by an `x-api-key`, so a partner system can create a support ticket. Each direction uses a separate key stored in Azure Key Vault.

## Security

Production secrets come from Azure Key Vault through the VM managed identity. Additional controls include HTTPS, RBAC, input validation, rate limiting, secure headers, audit logs, a local-only backend port, and a private MySQL port.

