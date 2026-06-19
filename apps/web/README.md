# SyndeoCare.ai

**Healthcare Staffing Platform** — Connect verified healthcare professionals with clinics instantly.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC)](https://tailwindcss.com/)

---

## Overview

SyndeoCare is a full-stack healthcare staffing platform that connects verified medical professionals with clinics and healthcare facilities. The platform features real-time messaging, shift management, document verification, geolocation-based matching, and multi-language support (English + Arabic RTL).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [Authentication Flow](#authentication-flow)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Internationalization (i18n)](#internationalization-i18n)
10. [Design System](#design-system)
11. [Self-Hosted Backend Setup](#self-hosted-backend-setup)
12. [API Reference (Edge Functions)](#api-reference)
13. [Security Model](#security-model)
14. [Contributing](#contributing)

---

## Architecture Overview

```
Frontend (Vite + React 18 + TypeScript)
    ↕ API Gateway auth + platform APIs
Backend (Custom gateway/services + owned PostgreSQL persistence)
```

- **Frontend**: Single-page application with lazy-loaded routes, error boundaries, and production-optimized React Query configuration.
- **Backend**: The app uses the owned API gateway for auth/session flows and protected/public platform routes.

## Tech Stack

| Category    | Technology                                    |
| ----------- | --------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite 5                  |
| Styling     | Tailwind CSS 3, Radix UI, Framer Motion       |
| State       | React Query (TanStack), React Context         |
| Routing     | React Router v6                               |
| Forms       | React Hook Form, Zod                          |
| i18n        | i18next (EN + AR with RTL)                    |
| Backend     | API gateway, Keycloak, PostgreSQL, S3 storage |
| Email       | Resend API                                    |
| Geolocation | PostGIS                                       |

## Project Structure

```
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── API.md                   # Edge function API reference
│   ├── DEPLOYMENT.md            # Deployment guide
│   └── SELF_HOSTING.md          # Self-hosted migration guide
├── public/                      # Static assets
├── src/
│   ├── assets/                  # Images and brand assets
│   ├── components/
│   │   ├── admin/               # Admin dashboard components
│   │   ├── booking/             # Booking management
│   │   ├── chat/                # Real-time messaging
│   │   ├── clinic/              # Clinic-specific components
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── home/                # Landing page sections
│   │   ├── layout/              # App shell (Header, Footer, Nav)
│   │   ├── notifications/       # Notification center
│   │   ├── onboarding/          # Onboarding flow
│   │   ├── shifts/              # Shift management
│   │   ├── ui/                  # Design system components (shadcn/ui)
│   │   ├── ErrorBoundary.tsx    # Global error boundary
│   │   └── PageSkeleton.tsx     # Route loading skeleton
│   ├── config/
│   │   ├── backend.ts           # Backend connection config
│   │   ├── constants.ts         # App-wide constants
│   │   ├── design-tokens.ts     # Design token definitions
│   │   └── theme.ts             # Theme configuration
│   ├── contexts/                # React Context providers
│   ├── design-system/           # Design system tokens and exports
│   ├── hooks/                   # Custom React hooks
│   ├── i18n/                    # Internationalization
│   │   └── locales/             # Translation files (en.json, ar.json)
│   ├── integrations/backend/    # Gateway-backed compatibility client & types
│   ├── lib/                     # Utility functions
│   └── pages/                   # Route pages
│       ├── dashboard/           # Role-specific dashboards
│       ├── onboarding/          # Onboarding flows
│       ├── profile/             # Profile management
│       └── shifts/              # Shift search and detail
├── lib/                         # Gateway, auth, storage, and UI helpers
└── tailwind.config.ts           # Tailwind configuration
```

## Getting Started

```bash
# Clone the repository
git clone <REPO_URL>
cd syndeocare

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

## Environment Variables

| Variable                     | Description                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_PLATFORM_API_BASE_URL` | Optional public Nest platform API root, for example `https://api.syndeocare.ai/platform-api/v1`; production `syndeocare.ai` defaults to the API subdomain, otherwise same-origin `/platform-api/v1` |
| `VITE_API_GATEWAY_BASE_URL`  | Optional protected API gateway root, for example `https://api.syndeocare.ai/v1`; production `syndeocare.ai` defaults to the API subdomain, otherwise same-origin `/v1`                              |

### Phased platform backend routing

- If `VITE_PLATFORM_API_BASE_URL` is set, the app will prefer the new platform backend for supported public reads such as professionals, clinics, and jobs.
- If `VITE_API_GATEWAY_BASE_URL` is also available, the app will additionally prefer the gateway for supported current-user profile and booking flows.
- The owned API gateway now handles sign-in, sign-up, refresh, logout, email verification, password reset, in-session password changes, and account deletion.
- Legacy browser fallbacks have been removed. Gateway failures now surface as gateway failures so account and document state stays in one backend.
- Public profile pages keep the primary profile render independent from auxiliary data such as related job listings, so a secondary API failure does not incorrectly surface the profile as “not found”.
- Public professional and clinic profile pages are restricted to authenticated viewers whose own actor record is already `verified` (admins remain allowed).

Edge function secrets:
| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Resend email service API key |
| `APP_URL` | Application URL for email links (default: `https://syndeocare.ai`) |

## Database Schema

### Core Tables

| Table                 | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `profiles`            | Professional user profiles                                  |
| `clinics`             | Clinic/facility profiles                                    |
| `user_roles`          | Role assignments (professional, clinic, admin, super_admin) |
| `user_preferences`    | Notification and display preferences                        |
| `shifts`              | Posted shifts with location, rate, requirements             |
| `bookings`            | Shift bookings with status tracking                         |
| `ratings`             | Mutual rating system                                        |
| `documents`           | Uploaded credentials and verification documents             |
| `availability`        | Weekly availability schedule                                |
| `conversations`       | Chat threads                                                |
| `messages`            | Individual messages with file attachments                   |
| `admin_conversations` | Admin-to-professional or admin-to-clinic chat threads       |
| `admin_messages`      | Messages inside admin chat threads, including attachments   |
| `notifications`       | In-app notifications                                        |
| `admin_notes`         | Internal admin notes                                        |
| `admin_permissions`   | Granular admin permission matrix                            |
| `certifications`      | System-managed certification types                          |
| `document_types`      | Configurable document requirements                          |
| `job_roles`           | Managed job role definitions                                |

## Authentication Flow

1. Sign up with email + password through the owned API gateway; passwords must be at least 8 characters to match the gateway contract.
2. Email verification links are issued by the custom identity service and confirmed at `/verify-callback`
3. Forgot-password requests send users to `/reset-password`, where signed reset links can update the password through the owned backend
4. Signed-in users can change their password from Settings through the gateway without leaving the app
5. Signed-in users can delete their account through Settings via the owned backend auth path
6. Logout runs through the dedicated `/logout` route, revokes the refresh token, clears local/session auth caches, and then hard-redirects back to `/auth`
7. Role selection during onboarding
8. JWT bearer tokens from the owned auth stack secure gateway routes
9. Gateway bearer tokens secure protected application data surfaces

## Onboarding Document Rules

- Required onboarding documents are driven from the admin-managed `document_types` table, including allowed extensions, maximum file size, ordering, and applicability per user type.
- Once a document has been uploaded and is `pending` or `verified`, the onboarding UI locks that slot and prevents replacement uploads.
- Re-upload is only enabled after an admin explicitly rejects the document, and the rejection reason is surfaced back to the user in the upload card.
- Admin document review surfaces use same-origin or signed URLs and the production CSP now allows framed AWS-hosted document previews in the dashboard.
- Admin verification writes use the configured API gateway (`VITE_API_GATEWAY_BASE_URL`).
- The clinic and professional profile document tabs use that same admin-managed `document_types` configuration, so profile uploads stay aligned with the current admin requirements instead of drifting to hardcoded frontend defaults.
- Professional profile specialties and certifications also read from the admin-managed catalogs, keeping editable profile taxonomy in sync with the admin panel.

## Admin Messaging

- Admins and super admins can now start direct chats with professionals and clinics from the admin dashboard and the user detail sheet.
- These conversations are stored separately from the existing professional-to-clinic chat tables so the legacy participant model remains intact.
- Verified badges are shown in the admin messaging UI for professional and clinic counterparts to preserve trust context during support conversations.

## Public Profile Access

- Public clinic and professional profile pages require an authenticated verified viewer (admins remain allowed).
- Blocked viewers are shown an explicit verified-account access state instead of falling through to the generic error boundary.

## User Roles & Permissions

| Role           | Capabilities                                           |
| -------------- | ------------------------------------------------------ |
| `professional` | Browse shifts, apply, manage profile, upload documents |
| `clinic`       | Post shifts, manage applicants, hire professionals     |
| `admin`        | Verify documents, manage users, view analytics         |
| `super_admin`  | Full system access, manage other admins                |

## Internationalization (i18n)

- **English** (LTR) — default
- **Arabic** (RTL) — full support with Cairo font

Translation files: `src/i18n/locales/{en,ar}.json`

## Design System

Built on Tailwind CSS with semantic design tokens:

- **Primary**: Deep Purple (`#663C6D`)
- **Accent**: Teal Blue (`#56849A`)
- **Success/Warning/Destructive**: Contextual colors
- Full dark mode support
- 44px+ touch targets for mobile

## Self-Hosted Backend Setup

Run the gateway and platform services with Keycloak, PostgreSQL, and S3-compatible storage configured.

## API Reference

See [docs/API.md](./docs/API.md) for edge function documentation.

## Security Model

- Row Level Security (RLS) on all tables
- Role-based access control via `user_roles`
- JWT validation on all authenticated endpoints
- Content Security Policy headers
- Input validation with Zod
- File upload restrictions by type and size

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

**SyndeoCare.ai** — Healthcare Staffing, Simplified.

© 2025–2026 SyndeoCare. All rights reserved.
