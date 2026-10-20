# Caserivo

Caserivo is a Next.js and Supabase foundation for a legal practice workspace. The current implementation includes a branded marketing site, Supabase email/password authentication, firm onboarding, a tenant-scoped database schema with RLS, and live lists/dashboard queries for clients, cases, hearings, and invoices.

## Local setup

1. Install Node.js 20+ and create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Apply `supabase/migrations/20261020090815_caserivo_initial_schema.sql` in the Supabase SQL editor or with `supabase db push` after linking the project.
4. In Supabase Auth, enable email/password and set the site URL and redirect URLs for `http://localhost:3000`.
5. Run `npm install`, then `npm run dev`.

New users enter firm details during signup. After they verify their email, the callback creates their firm workspace automatically. RLS derives access from `auth.uid()` and firm membership; the browser's firm ID is never treated as authorization. `.env.example` documents optional service-role, Resend, and scheduler configuration. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.

## Supabase setup

The migration creates tenant-scoped firms, memberships, clients, cases, hearings, invoices, invoice items, payments, documents and audit log tables. It enables RLS and creates a private `firm-documents` bucket with membership-scoped object policies. The `create_firm_workspace` RPC binds ownership to the authenticated user. Apply the migration to a new Supabase project and review policies against your firm's permission model before production use.

## Email, reminders, invoices

Authentication email is sent by Supabase Auth. A production hearing reminder worker, Resend delivery integration, invoice-number allocator, payment posting workflow, branded PDF endpoint, and team invitations still need implementation before those functions can be represented as available. No fake success is shown for unconfigured auth or record operations. Store a verified sender in `EMAIL_FROM`; protect any scheduler endpoint with `CRON_SECRET` and use the service role only server-side.

## Deployment

Deploy the Next.js app to Vercel, set the environment values in the project, configure Supabase production Auth URLs, and apply migrations to the production database. Keep Supabase backups enabled and test restoration. Configure rate limits, email delivery, monitoring, and a reviewed privacy notice/terms before inviting firms. This starter is not a legal compliance certification; review NDPA obligations, retention, processor agreements, access policies, and incident procedures with qualified counsel.

## Current feature status

- Working when Supabase is configured: signup/login/password reset email, signup email verification and resend, automatic firm creation during signup, RLS-backed dashboard counts, create/list/search for clients, cases, hearings and invoices.
- Database foundations: roles, tenant policies, private document bucket, payment and invoice-line schemas, snapshot columns, reminder tracking columns.
- Remaining: record detail/edit/archive screens, assignment-aware lawyer access, calendar interactions, reliable reminder dispatch/retry, payment transactions and invoice arithmetic, invoice numbering and PDF generation, file signed URLs, invitations, and automated test coverage.
