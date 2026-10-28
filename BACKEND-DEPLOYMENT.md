# Anna MC secure backend deployment (no Supabase)

## What is now in the repository
- Vercel Node serverless API routes for secure admin login/session/logout.
- Neon PostgreSQL schema for products, orders, announcements, staff, login rate limits and audit logs.
- Role-protected APIs for product catalogue, order support notes, announcements, staff access and audit inspection.
- `admin.html` admin interface.
- Public active-announcements endpoint.

## Before deployment
1. Create a Neon PostgreSQL project and run all of `database/schema.sql` in its SQL Editor.
2. In Vercel → Project → Settings → Environment Variables, set:
   - `DATABASE_URL`: Neon connection string (keep SSL enabled).
   - `ANNA_ADMIN_EMAIL`: your owner email.
   - `ANNA_ADMIN_PASSWORD_HASH`: bcrypt hash for a NEW password (do not reuse the password previously pasted in chat).
   - `ANNA_SESSION_SECRET`: at least 32 random characters.
3. Install dependencies with `npm install`, then deploy. Vercel automatically serves files under `api/` as serverless functions.
4. Open `/admin.html` and test sign-in, sign-out, invalid login lockout, product edits, announcements, staff roles and audit logs. Confirm browser cookies are Secure/HttpOnly/SameSite=Strict.
5. Add initial products using the admin panel. Prices in the API/schema are integer paise; the UI accepts rupees and converts to paise.
6. Add staff from the owner-only Staff Access tab. Store managers can manage products and announcements; support can view orders and edit support notes. Only the owner can manage staff and view audit logs.

Generate a bcrypt hash locally in a trusted environment using a password manager-generated unique password and `bcryptjs` (for example, after `npm install`, run `node -e "require('bcryptjs').hash(process.argv[1],12).then(console.log)" "YOUR-NEW-UNIQUE-PASSWORD"`). Do not paste the password into GitHub, this chat, or a client-side file. Put only the resulting hash into Vercel. Generate the session secret with `openssl rand -base64 48` or a trusted password manager.

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
