# INDDIA ERP

Production-oriented ERP foundation built with React, TypeScript, Vite, Tailwind CSS, React Router, and Supabase.

## Default Super Admin login

- Email: `superadmin@gmail.com`
- Password: `admin123`

The frontend includes a bootstrap super admin fallback so the platform owner can access the dashboard immediately even before Supabase credentials are configured. For full production auth, create the same Super Admin user in Supabase Auth and run [`database/schema.sql`](/Users/apple/Desktop/schoolwebsite/inddia-erp/database/schema.sql).

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Add your Supabase URL and anon key
4. Run the SQL in `database/schema.sql`
5. Start the app with `npm run dev`

## Auth rules

- No public signup
- Super Admin creates schools and school admin accounts
- School admins create staff and student accounts inside their own school
- Staff login uses email + password
- Student login resolves Student ID to email and then signs in through Supabase Auth

## Mobile app

The project is Capacitor-ready for Android and iOS.

Required mobile environment:

- `VITE_ADMIN_API_URL=https://your-live-domain.com/api/admin`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

Recommended commands:

1. `npm run mobile:add:android`
2. `npm run mobile:add:ios`
3. `npm run mobile:assets`
4. `npm run mobile:build`
5. `npm run mobile:open:android`
6. `npm run mobile:open:ios`

Notes:

- Native builds should use a deployed HTTPS API endpoint, not `localhost`
- The app uses `HashRouter` in native mode to avoid route-refresh issues
- Splash screen, status bar, and offline awareness are configured in Capacitor
