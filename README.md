# CampusFix AI HelpDesk

CampusFix is a secure university IT helpdesk system that allows students and faculty members to report technical problems, monitor their support requests, and communicate with the university IT team.

Technicians can review, claim, prioritize, update, and resolve submitted tickets. Administrators can manage users, account status, and system roles. Gemini AI automatically analyses each ticket and recommends an appropriate category and priority.

The application is deployed on a Microsoft Azure Ubuntu virtual machine and is available through HTTPS.

## Project Members

- **Swan Yi Win Thu Ya — ID: 6540200**
- **Zwe Khant Lin — ID: 6632710**
- **Chaw Yadanar Oo — ID: 6632782**

## Live Application

**CampusFix:**  
https://project1-backend.eastasia.cloudapp.azure.com/campusfix/

> The `/campusfix/` path is required because the application is deployed under a distinct Nginx location.

## Project Objectives

CampusFix was developed to demonstrate:

- Secure cloud deployment using Microsoft Azure
- REST API development with Node.js and Express
- Relational database management using MySQL and Prisma ORM
- University authentication using Microsoft Entra ID
- JWT-based authentication and role-based access control
- Secure secret management using Azure Key Vault
- AI integration using the Gemini API
- Nginx reverse-proxy configuration
- HTTPS encryption using Let’s Encrypt
- Automated application deployment

## Main Features

### Microsoft University Login

Users sign in using their university Microsoft accounts through Microsoft Entra ID.

CampusFix does not receive or store Microsoft passwords. The backend verifies the Microsoft access token before creating a CampusFix session.

### IT Ticket Management

Users can:

- Submit IT support tickets
- Provide a title, description and location
- View the progress of their tickets
- Add comments to tickets
- View ticket category, priority and status

Technicians and administrators can:

- View the complete support queue
- Assign tickets to technicians
- Change ticket priority
- Update ticket status
- Add support comments
- Mark tickets as resolved or closed

### Gemini AI Classification

Gemini AI analyses the title, description and location of a new ticket.

It automatically recommends:

- Ticket category
- Ticket priority
- Triage explanation

Supported categories include:

- Hardware
- Software
- Network
- Account Access
- Audio Visual
- Other

If the external AI service is temporarily unavailable, CampusFix uses a local keyword-based fallback so that ticket submission can continue.

### Role-Based Access Control

CampusFix supports four roles:

| Role | Access |
|---|---|
| Student | Create tickets and view their own tickets |
| Faculty | Create tickets and view their own tickets |
| Technician | View and manage the complete ticket queue |
| Administrator | Manage tickets, users, roles and account status |

New Microsoft users receive the Student role by default.

Administrator email addresses are stored securely in Azure Key Vault. Administrators can promote approved users to Technician or Administrator through the Users page.

### User Administration

Administrators can:

- View registered users
- Change user roles
- Activate or deactivate accounts
- Promote students or faculty members to technicians
- Control access without modifying source code

### Ticket Audit History

Important actions are recorded in the database, including:

- User login
- Ticket creation
- Ticket updates
- User role changes

Completed tickets use the Resolved or Closed status instead of being permanently deleted. This preserves the helpdesk history for auditing and reporting.

## System Architecture

```text
University User
       |
       | HTTPS
       v
Azure Public IP and DNS
       |
       v
Nginx Reverse Proxy
       |
       +-- /campusfix/ --------> React Frontend
       |
       +-- /campusfix/api/ ----> Node.js and Express API
                                      |
                                      +-- MySQL Database
                                      +-- Prisma ORM
                                      +-- Microsoft Entra ID
                                      +-- Azure Key Vault
                                      +-- Gemini API
```

## Architecture Layers

### Presentation Layer

The user interface is developed using React and Vite.

It provides:

- Microsoft login
- Ticket submission
- Ticket dashboard
- Ticket status and assignment controls
- User and role management
- Responsive layouts for different screen sizes

### Application Layer

The backend is developed using Node.js and Express.

It is responsible for:

- REST API endpoints
- Request validation
- Microsoft token verification
- CampusFix JWT creation
- Role and permission checks
- Ticket business logic
- Gemini AI communication
- Database operations

### Data Layer

CampusFix uses MySQL as its relational database.

Prisma ORM provides:

- Database models
- Type-safe database access
- Relationships
- Database migrations
- Consistent schema management

## Database Design

The main Prisma models are:

### User

Stores:

- Microsoft identity
- Name
- University email
- CampusFix role
- Account status

### Ticket

Stores:

- Issue title
- Description
- Room or location
- AI-generated category
- Priority
- Status
- AI triage explanation
- Requester
- Assigned technician
- Creation and update times

### Comment

Stores conversations and updates associated with a ticket.

### AuditLog

Stores important security and administrative events.

## Authentication Workflow

```text
User selects Sign in with Microsoft
                |
                v
Microsoft Entra ID authenticates the user
                |
                v
Frontend receives a Microsoft access token
                |
                v
Backend verifies signature, tenant, issuer and audience
                |
                v
Backend finds or creates the user in MySQL
                |
                v
Backend reads the current CampusFix role
                |
                v
Backend issues a CampusFix JWT
                |
                v
JWT is used for protected API requests
```

Microsoft Entra ID determines who the user is. CampusFix determines what the user is permitted to do.

## Session Security

The CampusFix JWT is stored in browser session storage.

This means:

- Login information is not included in the URL
- Copying the website URL does not copy the user session
- Another browser must authenticate separately
- Signing out removes the token
- Expired sessions must authenticate again
- Protected requests require a valid JWT

## API Security

All ticket routes require authentication.

The backend returns:

- `401 Unauthorized` when a token is missing or invalid
- `403 Forbidden` when the authenticated user does not have the required role

The frontend hides restricted controls, but the backend independently checks every protected request. Therefore, manually calling the API cannot bypass role permissions.

## REST API Summary

| Method | Endpoint | Purpose | Required access |
|---|---|---|---|
| GET | `/campusfix/api/health` | Check application health | Public |
| POST | `/campusfix/api/auth/exchange` | Exchange Microsoft token | Microsoft user |
| GET | `/campusfix/api/auth/me` | Return current user | Authenticated |
| GET | `/campusfix/api/tickets` | Retrieve permitted tickets | Authenticated |
| POST | `/campusfix/api/tickets` | Create a ticket | Authenticated |
| POST | `/campusfix/api/tickets/:id/comments` | Add a ticket comment | Authorized user |
| PATCH | `/campusfix/api/tickets/:id` | Update ticket status or assignment | Technician/Admin |
| GET | `/campusfix/api/users` | Retrieve users | Admin |
| PATCH | `/campusfix/api/users/:id` | Change role or account status | Admin |

## Azure Infrastructure

CampusFix is hosted on an Ubuntu virtual machine in Microsoft Azure.

The infrastructure includes:

- Azure Ubuntu Virtual Machine
- Static public IP address
- Azure DNS name
- Nginx reverse proxy
- Let’s Encrypt SSL certificate
- Azure Key Vault
- VM system-assigned managed identity
- MySQL database
- systemd application service
- Linux firewall
- Automated deployment script

## Network Security

Only the required public services are exposed:

| Port | Purpose |
|---:|---|
| 22 | Restricted SSH administration |
| 80 | HTTP and certificate validation |
| 443 | HTTPS application access |

The following services are private:

| Port | Service |
|---:|---|
| 3100 | Express backend |
| 3306 | MySQL database |

The Express application listens on `127.0.0.1`, so users cannot access it directly from the internet. All public application traffic passes through Nginx.

## Nginx and HTTPS

Nginx performs two main tasks:

1. Serves the compiled React frontend under `/campusfix/`
2. Forwards `/campusfix/api/` requests to the private Express backend

HTTPS is enabled using a Let’s Encrypt certificate. This encrypts communication between users and the application.

## Azure Key Vault Integration

Production secrets are stored in Azure Key Vault rather than in source code or a production `.env` file.

Stored secrets include:

- Database connection URL
- JWT signing secret
- Gemini API key
- Gemini model name
- Administrator email addresses

The Azure VM uses a system-assigned managed identity with the **Key Vault Secrets User** role.

The backend uses:

- `DefaultAzureCredential`
- `SecretClient`
- Key Vault secret-name mapping

During startup, the backend authenticates using the VM identity and retrieves the required secrets securely.

Secret values must never be committed to GitHub or displayed publicly.

## Prisma ORM and Migrations

Prisma connects the Express backend to MySQL.

The Prisma schema defines:

- User roles
- Ticket categories
- Ticket priorities
- Ticket statuses
- User and ticket relationships
- Comments
- Audit records

Version-controlled Prisma migrations ensure that the database structure can be deployed consistently across environments.

## Automated Deployment

The deployment process automates:

- Dependency installation
- Prisma Client generation
- Database migration execution
- React production build
- Frontend installation
- systemd service configuration
- Nginx configuration
- Application restart

This reduces manual deployment errors and provides a repeatable release process.

## Project Structure

```text
CampusFix/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   └── src/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── config.js
│       ├── db.js
│       └── server.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── auth.jsx
│       ├── config.js
│       └── styles.css
├── deployment/
│   ├── campusfix.service
│   ├── nginx-campusfix.conf
│   └── bootstrap.conf.example
├── scripts/
│   └── deploy.sh
├── docs/
└── README.md
```

## Technologies

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS
- Microsoft Authentication Library

### Backend

- Node.js
- Express
- Prisma ORM
- JSON Web Token
- Zod validation
- REST API

### Database

- MySQL
- Prisma migrations

### Cloud and Deployment

- Microsoft Azure
- Ubuntu Linux
- Azure Virtual Machine
- Azure Key Vault
- Managed Identity
- Nginx
- Let’s Encrypt
- systemd
- GitHub

### External Integration

- Microsoft Entra ID
- Gemini API

## Security Measures

CampusFix includes:

- Microsoft Entra ID authentication
- Backend Microsoft-token verification
- JWT session authentication
- Role-based API authorization
- Azure Key Vault secret management
- Managed identity authentication
- HTTPS encryption
- Request validation
- API rate limiting
- Secure HTTP headers
- CORS restrictions
- Private backend and database ports
- Audit logging
- Account activation controls
- No production secrets in GitHub

## Current Project Status

The following components have been completed:

- Azure VM deployment
- Nginx reverse proxy
- HTTPS configuration
- React frontend
- Express REST API
- MySQL database
- Prisma schema and migrations
- Microsoft Entra ID login
- CampusFix JWT authentication
- Role-based access control
- Administrator user management
- Azure Key Vault integration
- Managed identity configuration
- Gemini ticket classification
- Automated deployment
- GitHub source-code management

## Conclusion

CampusFix demonstrates a secure full-stack application deployed on Microsoft Azure. It combines cloud infrastructure, identity management, secret management, relational database design, protected REST APIs, AI-assisted ticket classification and automated deployment.

The project provides a practical solution for managing university IT support requests while maintaining clear separation between students, technicians and administrators.
