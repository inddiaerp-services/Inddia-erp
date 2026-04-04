# INDDIA ERP

Production-oriented ERP foundation built with React, TypeScript, Vite, Tailwind CSS, and React Router.

The current codebase is in the middle of a platform migration from Supabase to Firebase. Firebase scaffolding has been added in:

- [src/services/firebaseClient.ts](/Users/apple/Desktop/schoolwebsite/inddia-erp/src/services/firebaseClient.ts)
- [server/firebaseAdmin.mjs](/Users/apple/Desktop/schoolwebsite/inddia-erp/server/firebaseAdmin.mjs)
- [database/firebase-schema.md](/Users/apple/Desktop/schoolwebsite/inddia-erp/database/firebase-schema.md)

## Default Super Admin login

- Email: `superadmin@gmail.com`
- Password: `admin123`

The frontend includes a bootstrap super admin fallback so the platform owner can access the dashboard immediately even before production auth is configured.

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Add Firebase Admin values to `.env.server`
4. Start the app with `npm run dev`

## Auth rules

- No public signup
- Super Admin creates schools and school admin accounts
- School admins create staff and student accounts inside their own school
- Staff login uses email + password
- Student login resolves Student ID to a managed account

## Mobile app

The project is Capacitor-ready for Android and iOS.

Required mobile environment:

- `VITE_ADMIN_API_URL=https://your-live-domain.com/api/admin`
- `VITE_FIREBASE_API_KEY=...`
- `VITE_FIREBASE_AUTH_DOMAIN=...`
- `VITE_FIREBASE_PROJECT_ID=...`
- `VITE_FIREBASE_STORAGE_BUCKET=...`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
- `VITE_FIREBASE_APP_ID=...`

Recommended commands:


Notes:

- Native builds should use a deployed HTTPS API endpoint, not `localhost`
- The app uses `HashRouter` in native mode to avoid route-refresh issues
- Splash screen, status bar, and offline awareness are configured in Capacitor
