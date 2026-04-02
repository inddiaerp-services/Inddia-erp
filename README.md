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
