# Swami Vivekanand Sikshan Sansthan — School Fee Management System (SFMS)

A school fee-management application for **Swami Vivekanand Sikshan Sansthan, Prayagraj, Uttar Pradesh**, designed to support student registration, academic sessions, fee collection, receipts, financial reporting, and administrative workflows for LKG through Class 12.

> **Project status:** The repository contains a React/TypeScript frontend, an Express/TypeScript API, a Prisma/PostgreSQL data model, operational scripts, tests, documentation, and a standalone HTML interface. The application has not been independently verified in a production deployment. Review the setup, security, financial workflows, and backup/restore process before entering real student or payment records.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Requirements](#requirements)
- [Local Setup](#local-setup)
- [Neon PostgreSQL Configuration](#neon-postgresql-configuration)
- [Running the Application](#running-the-application)
- [Standalone HTML Interface](#standalone-html-interface)
- [Testing](#testing)
- [Backup and Recovery](#backup-and-recovery)
- [Security and Data Protection](#security-and-data-protection)
- [Documentation](#documentation)
- [License](#license)

## Features

### Student and Academic Management

- Student registration, search, directory, and student-profile workflows.
- Class and section-related student data.
- Academic-session configuration.
- Student fee-ledger workflows.

### Fee Collection and Receipts

- Fee collection and payment-recording workflows.
- Payment allocation and ledger-calculation services.
- Receipt generation and receipt-register/reprint workflows.
- Receipt numbering and payment-idempotency safeguards represented in the codebase.
- Cash and UPI payment options in the standalone interface. Confirm the supported payment modes in the deployed React/API application before operational use.

### Administration and Reporting

- Administrative dashboard and fee-structure management.
- Reports and spreadsheet export using ExcelJS.
- Spreadsheet formula-injection sanitization in export-related code.
- Selected financial approval and audit-related workflows.
- Database migrations and constraints intended to protect financial records.

### Database and Operations

- PostgreSQL database with Prisma ORM.
- Configuration for local PostgreSQL or a hosted PostgreSQL database such as Neon.
- Windows PowerShell scripts for selected setup and scheduled-task workflows.
- Encrypted database-backup utilities.
- Restore-verification tooling.

**Important:** The presence of a feature, script, or test file does not by itself prove that the feature works correctly in production. Backup restoration, financial integrity, authentication, authorization, and deployment configuration require practical testing.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Reporting and exports | PDFKit, ExcelJS |
| Security-related libraries | Argon2, Helmet, cookie-parser, CORS and rate-limiting utilities |
| Testing | Repository-configured unit, integration, and end-to-end test tools |

Refer to `package.json` and the workspace manifests for the exact versions and available scripts.

## Repository Structure

The repository includes the following major components. Some directories contain additional nested files.

```text
swami-vivekanand-fee-management/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       ├── receipts/
│   │       ├── reports/
│   │       ├── exports/
│   │       ├── security/
│   │       └── services/
│   └── web/
│       └── src/
│           ├── pages/
│           ├── components/
│           ├── hooks/
│           ├── layouts/
│           ├── services/
│           └── utils/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── backup/
│   ├── db/
│   ├── restore/
│   └── windows/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
├── swami_vivekanand_sfms.html
├── .env.example
└── package.json
```

## Requirements

For the React and API application, prepare the following:

- Node.js version compatible with the project's `engines` declaration and dependencies.
- npm compatible with the repository's package configuration.
- PostgreSQL, either installed locally or hosted through Neon.
- Git, if cloning the project repository.
- PowerShell for the Windows-specific scripts.

Check `package.json`, `.env.example`, and the installation documentation for the exact environment requirements before installing.

## Local Setup

### 1. Obtain the project

Clone your private GitHub repository:

```bash
git clone <YOUR_PRIVATE_REPOSITORY_URL>
cd swami-vivekanand-fee-management
```

Alternatively, extract the project ZIP and open a terminal in the extracted directory.

Replace `<YOUR_PRIVATE_REPOSITORY_URL>` with the actual repository URL.

### 2. Install dependencies

From the project root, run:

```bash
npm install
```

The repository does not include a package lockfile in the reviewed archive. If you intend to deploy the application, generate and commit the appropriate lockfile after resolving dependencies and validating the installation.

### 3. Configure environment variables

Create a local `.env` file from `.env.example`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure the variables required by the application. Depending on the selected database and deployment configuration, these may include:

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`
- `CSRF_SECRET`
- `ALLOWED_ORIGINS`
- `BACKUP_ENCRYPTION_KEY_HEX`

Use the exact names and requirements in `.env.example` and the relevant source code. Do not leave placeholder secrets in place.

**Never commit `.env`, database passwords, authentication secrets, encryption keys, real student data, or database backups to GitHub.**

### 4. Prepare the database

Review the Prisma schema and committed migrations before applying them.

The repository includes Prisma database-generation and migration scripts. Use the exact commands listed in the root `package.json`; do not assume a script exists merely because it is a common Prisma command.

For a new development database, seed data only when you intentionally need test records. Do not run seed scripts against a database containing real school records without reviewing their effects first.

## Neon PostgreSQL Configuration

The application includes configuration and a database-readiness utility for Neon-hosted PostgreSQL. Neon provides the database; it does not run the Express API or serve the React frontend.

### 1. Create a Neon project

1. Sign in to [Neon](https://neon.tech/).
2. Create a PostgreSQL project.
3. Choose a region close to the backend hosting region where possible.
4. Create or select the database and database role for SFMS.
5. Copy the connection details from the Neon dashboard.

### 2. Configure the connection strings

Set the appropriate environment variables in your local `.env` file or backend hosting provider.

- **`DATABASE_URL`** — the application database connection URL. Use the pooled connection URL if that is what the application's Prisma configuration expects.
- **`DIRECT_URL`** — the direct database connection URL for operations that require a direct connection, such as migrations, if configured that way in the Prisma schema.

Use the exact connection-string format and options recommended by Neon and required by the project's `.env.example` and `prisma/schema.prisma`.

Do not commit these connection strings to GitHub or place them in frontend environment variables that are exposed to the browser.

### 3. Apply database migrations

Before using a new Neon database:

1. Review `prisma/schema.prisma`.
2. Review the committed migration files.
3. Confirm that the environment variables point to the intended Neon project.
4. Run the repository's configured migration command against that database.
5. Verify the resulting schema and test the application's database connection.

Do not run migrations or seed scripts against a database containing real records without a verified backup and an appropriate maintenance plan.

### 4. Check Neon readiness

The repository contains a Neon deployment-readiness utility under `scripts/db/`. Review its implementation and usage instructions before running it. A successful configuration or readiness check does not establish that all application workflows work correctly.

### 5. Understand the deployment architecture

A possible deployment arrangement is:

| Component | Responsibility |
|---|---|
| Vercel | React frontend |
| Render | Node.js/Express API |
| Neon | Hosted PostgreSQL database |
| GitHub | Source-code repository |

This is a deployment option, not a claim that the application is already deployed or that every required environment variable is configured.

Keep the backend and database in compatible regions where possible. Configure the production frontend origin in the backend's allowed-origin settings and use HTTPS for public network access.

Review current provider pricing, usage limits, sleep behavior, storage limits, and backup options before relying on a free-tier deployment.

## Running the Application

Use the root `package.json` as the source of truth for available commands.

Common workflows include:

- Installing dependencies.
- Generating the Prisma client.
- Applying committed database migrations.
- Running the frontend and API in development.
- Building the workspaces.
- Starting the built API.
- Running the configured tests.

Before copying commands from an older README or external tutorial, verify that the corresponding script is present in the current repository. This avoids running nonexistent or inappropriate commands.

The API requires a correctly configured database connection. Starting the frontend alone does not start the API or establish database connectivity.

## Standalone HTML Interface

The repository also contains:

```text
swami_vivekanand_sfms.html
```

This is a standalone HTML artifact separate from the React frontend and Express API.

You can preview the file locally by opening it in a browser. If a static server is required, use a trusted local development server and bind it to `127.0.0.1` when only local access is needed.

A standalone HTML preview does not start the React application, the Express API, or the PostgreSQL database. Do not assume that information entered in this interface is stored in PostgreSQL unless that integration has been explicitly implemented and verified.

## Testing

The repository contains test directories for unit, integration, and end-to-end testing.

Before running tests:

1. Read the test instructions and root `package.json`.
2. Install dependencies.
3. Configure a separate test database and required environment variables.
4. Confirm that test scripts cannot target a production database.
5. Run the relevant test commands from the repository root.

A test file existing in the repository does not mean it has passed. Test results should be reported only after the commands have actually run and their output has been reviewed.

Financial workflows that particularly need verification include:

- Duplicate payment submissions and idempotency.
- Partial payments and allocation across fee periods.
- Concurrent payments against the same student balance.
- Receipt numbering and receipt reprints.
- Reversals, refunds, concessions, and adjustments.
- Role-based access and unauthorized API requests.
- Academic-session changes and fee-structure updates.

## Backup and Recovery

The repository includes database-backup scripts, Windows-specific backup scheduling utilities, and restore-related tooling.

Before relying on these scripts:

1. Read the relevant files under `scripts/backup/`, `scripts/restore/`, and `scripts/windows/`.
2. Confirm the PostgreSQL utility paths and backup destination directories for the target environment.
3. Configure the required backup encryption key securely.
4. Confirm that the backup includes the expected database content.
5. Store an independent copy of important backups in a separate protected location.
6. Test recovery into a separate, disposable PostgreSQL database.

### Known restore limitation

In the reviewed source, the JavaScript restore utility verifies, decrypts, and extracts the backup but does not complete the SQL restoration into PostgreSQL. The PowerShell wrapper passes an `--execute-restore` flag that the JavaScript script does not implement.

**Do not treat the current restore utility as a completed database-recovery solution.** Implement and test the actual restore operation before storing real student or financial records in the system.

Backup success and restore success are different outcomes. A usable backup must be demonstrated by a successful restore test.

## Security and Data Protection

Because this system may hold student details and financial records:

- Keep the GitHub repository private during development and before a security review.
- Never commit `.env`, secrets, credentials, real student data, receipt exports, database dumps, or encryption keys.
- Replace sample credentials and development secrets before deployment.
- Configure backend CORS/allowed origins for the actual frontend URL.
- Use HTTPS for network-accessible deployments.
- Verify authentication and role-based authorization on the backend, not only in the frontend.
- Use a separate test database for automated tests.
- Restrict database credentials and access to the people and services that need them.
- Review payment, receipt, audit, refund, and reversal workflows before real-world use.
- Keep independent backups and test the complete recovery process.
- Do not rely on the current restore utility for recovery until the missing restore operation has been implemented and validated.

## Documentation

The repository contains additional guides under `docs/`, including documentation for installation, usage, security, database changes, troubleshooting, and backup/recovery.

Open the actual files in `docs/` to confirm the current instructions before following them. Keep README links aligned with the filenames and paths present in the repository.

## License

The reviewed project declares itself `UNLICENSED` in its package configuration, and no open-source license was identified in the reviewed repository.

Unless you add a license, do not assume that others have permission to reuse, modify, or redistribute this project. For a private school-management application, keeping the repository private while development and security review are ongoing is sensible.
