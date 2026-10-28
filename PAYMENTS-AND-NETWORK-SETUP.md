# Anna MC Network Store: payment and rank-delivery setup

## Current state
The static store now lets a buyer choose **LifeSteal** or **Practice**, enter a Minecraft username, and see the target server attached to each cart item. Checkout is intentionally only an order preview. It does **not** charge a payment method or grant a rank yet.

## Target architecture (without Supabase)
- Website: Vercel, with server-side API routes (never put secrets in browser JavaScript).
- Database: Neon Postgres, storing products, orders, payment IDs, delivery status, and staff roles.
- Payments: Razorpay Checkout (INR) plus a verified Razorpay webhook. A success/redirect page alone must never mark an order paid.
- Delivery: a small authenticated plugin/bridge installed on the Minecraft network. It accepts only pre-approved product IDs and server targets; it must not expose arbitrary console-command execution to the public internet.
- Network permissions: LuckPerms groups/prefixes, configured consistently on both backends. Use separate groups for LifeSteal and Practice if perks differ.

## Required server-side environment variables
Configure these in Vercel Project Settings → Environment Variables, for Production and Preview separately:
- `DATABASE_URL`: Neon Postgres connection string.
- `RAZORPAY_KEY_ID`: public key ID, used only by the server-created checkout response.
- `RAZORPAY_KEY_SECRET`: secret API key; server-side only.
- `RAZORPAY_WEBHOOK_SECRET`: secret used to verify webhook signatures.
- `ANNA_ADMIN_EMAIL`: primary admin email.
- `ANNA_ADMIN_PASSWORD_HASH`: password hash, never the raw password.
- `ANNA_SESSION_SECRET`: long random secret for signed, secure sessions.
- `ANNA_DELIVERY_URL`: private HTTPS endpoint for the Minecraft delivery bridge.
- `ANNA_DELIVERY_SECRET`: long random shared secret between the API and bridge.

Do not commit any of these values to GitHub or prefix secrets with `NEXT_PUBLIC_` / `VITE_`. The currently shared admin password has appeared in chat; change it before using a real admin login and store only a secure hash.

## Payment-to-rank flow
1. Buyer chooses LifeSteal or Practice, enters their exact Minecraft username, and adds products.
2. Server validates product IDs/prices from the database (never trusts a browser-submitted amount), creates a pending order, and creates a Razorpay order.
3. Razorpay Checkout processes the payment in INR.
4. The webhook endpoint verifies the raw request body using the Razorpay webhook signature and secret. Only a verified `order.paid` event marks an order paid. Make webhook processing idempotent.
5. A background delivery job sends a signed, unique delivery request to the bridge.
6. Bridge validates the signature, order ID, username, target server, product ID and duplicate-delivery ID, then grants the mapped rank/perks.
7. Website records delivered/failed status and gives admins a retry button. Never grant rewards from the browser's success callback.

Official reference: https://razorpay.com/docs/webhooks/ and https://razorpay.com/docs/payments/orders/

## Minecraft network connection
- Keep Velocity as the public entry point and point its backend definitions to the actual LifeSteal and Practice server addresses/ports in the hosting panel.
- Players connect using `play.annamc.bond`; DNS must point to the Velocity proxy. If using a non-default Java port, configure the DNS SRV record or tell players the port.
- Install the same LuckPerms version/config on both Paper backends and configure shared SQL storage so ranks persist consistently. Check each rank's permission nodes on each server.
- Configure delivery mappings explicitly, e.g. `lifesteal: VIP -> lifesteal_vip` and `practice: VIP -> practice_vip`. These are examples only; create the groups and permissions first.
- Do not expose RCON or a command-execution endpoint to the public internet. Restrict the bridge to private networking or strict HTTPS authentication, and only permit fixed product-to-group mappings.
- Test using Razorpay test mode and a test Minecraft account before enabling live payments.

## Admin panel requirements
The admin API must enforce authentication server-side on every request. Use role-based permissions (owner, store manager, support), audit logs, CSRF protection, rate limits, and secure, HttpOnly, SameSite cookies. The panel should manage products/prices, which server a product targets, order/payment status, delivery retries, announcements, and staff roles. Hiding an admin page or checking an email in client-side JavaScript is not security.

## Still needed before live automation
- Razorpay account and live/test API keys.
- Neon database and schema.
- Vercel environment variables.
- Actual Velocity + LifeSteal + Practice backend hostnames/ports.
- A secure Minecraft delivery plugin/bridge installed on the network.
- Exact product catalogue and rank/group names for each server.
