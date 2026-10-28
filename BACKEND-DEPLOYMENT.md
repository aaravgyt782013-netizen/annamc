# Anna MC secure backend deployment (no Supabase)

## What is now in the repository
- Vercel Node serverless API routes for secure admin login/session/logout.
- Neon PostgreSQL schema for products, orders, announcements, staff, login rate limits and audit logs.
- Role-protected APIs for product catalogue, order support notes, announcements, staff access and audit inspection.
- `admin.html` admin interface.
- Public active-announcements endpoint.

## Before deployment
1. Ensure a PostgreSQL database is attached and run all of `database/schema.sql` once against it. Antideploy can provide `DATABASE_URL` for a connected app; if you use a separate Neon database, use that connection string instead.
2. In Antideploy → your app → Environment Variables (or the equivalent deployment settings), set:
   - `DATABASE_URL`: Neon connection string (keep SSL enabled).
   - `ANNA_ADMIN_PASSWORD`: a strong owner password stored only in the deployment environment. Owner login no longer supports `ANNA_ADMIN_PASSWORD_HASH`.
   - `ANNA_SESSION_SECRET`: at least 32 random characters.
3. Deploy this repository as a Node app with `npm start` (the repository now includes `server.js` and a `start` script). The server serves `/home`, `/store`, and `/admin`, and dispatches `/api/*` requests to the existing API handlers. Do not deploy it as a static-only site if you need admin APIs to work.
4. Open `/home`, use Login, and sign in with the owner email and `ANNA_ADMIN_PASSWORD`. The owner-only **Admin Panel** link should appear and open `/admin`. Test sign-out, product edits, announcements, staff roles and audit logs. Confirm browser cookies are Secure/HttpOnly/SameSite=Strict.
5. Add initial products using the admin panel. Prices in the API/schema are integer paise; the UI accepts rupees and converts to paise.
6. Add staff from the owner-only Staff Access tab. Store managers can manage products and announcements; support can view orders and edit support notes. Only the owner can manage staff and view audit logs.

Use a strong, unique `ANNA_ADMIN_PASSWORD` in the deployment environment. Never commit it to GitHub or put it in client-side files. Generate `ANNA_SESSION_SECRET` with a trusted password manager or `openssl rand -base64 48`.

## Explicitly not live yet
- No payment provider has been connected: you said you still need a Razorpay account.
- No order-creation/checkout endpoint or verified Razorpay webhook is implemented yet.
- No automatic rank delivery is implemented; the Minecraft bridge/plugin has not been installed or tested.
- Order records are currently an admin data model, not evidence of paid purchases. The admin UI/API intentionally cannot mark orders paid or delivered.
- The existing public store's checkout remains its current preview flow until Razorpay test credentials, webhook verification, order validation, and the plugin bridge are implemented and tested.

## Next integration milestones
1. Create a Razorpay account and enable test mode; add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only after account creation.
2. Implement server-created Razorpay orders from active database products, using server-side price lookup and signed webhook verification with idempotency.
3. Build/install the fixed-mapping Minecraft delivery plugin for Velocity-connected Paper backends, configure shared LuckPerms storage, and test on a non-production account.
4. Only after test payments, duplicate webhook tests, failed delivery/retry tests and server mapping checks pass should live payments or automatic rewards be enabled.

Never expose database, payment, session or delivery secrets in browser code or commit them to Git.
The active catalogue is also available from `GET /api/products` (INR amounts in integer paise). The current `store.html` UI has not yet been switched to render this API, so edits in the admin catalogue do not automatically change the displayed store cards until that frontend wiring is completed.

The code is committed to GitHub, but this chat cannot confirm that Antideploy has completed a successful new deployment or that your environment variables and database schema are present. Verify the deployment logs and run the checklist above before treating login or database-backed features as live.
