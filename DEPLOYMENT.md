# HBS Wear — Production Deployment Guide (Render & Vercel)

This guide documents the exact configuration, environment variables, commands, and order of operations required to deploy the HBS Wear ecommerce application to production using **Render** (Node.js API + PostgreSQL) and **Vercel** (React/Vite SPA).

---

## 1. Architecture Overview

* **Frontend**: React 19 + Vite + TypeScript Single Page Application (SPA), hosted on **Vercel**.
* **Backend**: Node.js + Express 5 + TypeScript + Prisma ORM, hosted on **Render** (Web Service).
* **Database**: Managed PostgreSQL, hosted on **Render** (or any cloud PostgreSQL provider).
* **Media & Assets**: Cloudinary (Product images and homepage assets).
* **Payments**:
  * Stripe (Credit/Debit Card payments via PaymentIntents & Webhook signatures).
  * Safaricom Daraja M-Pesa (STK Push prompts & async JSON callbacks).
* **Background Jobs**: Node-cron in-process worker sweeping expired reservations every minute.

---

## 2. Render PostgreSQL Setup

1. In your **Render Dashboard**, click **New +** and select **PostgreSQL**.
2. Configure database settings:
   * **Name**: `hbs-wear-db`
   * **Database**: `hbs_wear`
   * **User**: `hbs_wear_user`
   * **Region**: Select the region closest to your target audience (e.g., Frankfurt/London for Kenya latency, or Oregon/Ohio).
   * **PostgreSQL Version**: 16 (default)
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (used if your backend web service is on Render in the same region) or the **External Database URL** (for remote admin connections or migrations).

---

## 3. Render Backend Service Setup

You can deploy using either the Blueprint (`render.yaml`) or manually through the Render Dashboard.

### Option A: Using the Render Blueprint (`render.yaml`)
1. In Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your GitHub repository.
3. Render reads `render.yaml` and automatically provisions:
   * The `hbs-wear-db` PostgreSQL instance.
   * The `hbs-wear-api` Node.js web service with all build and start commands configured.

### Option B: Manual Setup in Render Dashboard
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following exact settings:
   * **Name**: `hbs-wear-api`
   * **Region**: Same region as your PostgreSQL instance.
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npm run build && npm run prisma:deploy
     ```
     *(This automatically runs `prisma generate`, compiles TypeScript via `tsc`, and applies pending database migrations via `prisma migrate deploy` before startup).*
   * **Start Command**:
     ```bash
     npm start
     ```
     *(Runs `node dist/index.js`, binding to `0.0.0.0:$PORT`).*
   * **Health Check Path**: `/health` (or `/api/health`)
   * **Auto-Deploy**: `Yes` (deploys automatically on push to `main`).

---

## 4. Backend Environment Variables (Render)

Configure these in **Render Dashboard** -> **hbs-wear-api** -> **Environment**:

| Variable Name | Required | Description / Example Value |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | `production` |
| `PORT` | **Yes** | Auto-injected by Render (default `10000` or `5000`) |
| `DATABASE_URL` | **Yes** | Render internal connection string: `postgresql://user:password@dpg-...:5432/hbs_wear` |
| `CLIENT_URL` | **Yes** | Production frontend URL without trailing slash: `https://hbs-wear.vercel.app` |
| `ALLOWED_ORIGINS` | No | Comma-separated extra origins (e.g., custom domain or Vercel preview URLs) |
| `JWT_SECRET` | **Yes** | High-entropy random secret (min 32 chars): `openssl rand -base64 32` |
| `ADMIN_EMAIL` | No | Initial admin email used if executing seed script (e.g., `admin@hbswear.com`) |
| `ADMIN_PASSWORD` | No | Initial admin password used if executing seed script |
| `CLOUDINARY_CLOUD_NAME`| **Yes** | Your Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | **Yes** | Your Cloudinary API Key |
| `CLOUDINARY_API_SECRET`| **Yes** | Your Cloudinary API Secret |
| `CLOUDINARY_FOLDER` | No | Target folder for uploads (default: `hbs-wear/products`) |
| `STRIPE_SECRET_KEY` | **Yes** | Secret API key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY`| **Yes** | Publishable key (`pk_live_...` or `pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET`| **Yes** | Endpoint signing secret from Stripe Dashboard (`whsec_...`) |
| `DARAJA_CONSUMER_KEY` | **Yes** | Safaricom Daraja Consumer Key |
| `DARAJA_CONSUMER_SECRET`|**Yes** | Safaricom Daraja Consumer Secret |
| `DARAJA_SHORTCODE` | **Yes** | Till / Paybill number (default test: `174379`) |
| `DARAJA_PASSKEY` | **Yes** | Daraja Lipa Na M-Pesa Online Passkey |
| `DARAJA_CALLBACK_URL` | **Yes** | Public Render HTTPS callback URL: `https://hbs-wear-api.onrender.com/api/payments/mpesa/callback` |
| `DARAJA_ENVIRONMENT` | **Yes** | `sandbox` (testing) or `production` (live) |

---

## 5. Vercel Frontend Setup

1. In your **Vercel Dashboard**, click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `client` *(recommended)* or leave as `./` (both are supported via `client/vercel.json` and root `vercel.json`).
   * **Build Command**: `npm run build` *(or `cd client && npm install && npm run build` if root).*
   * **Output Directory**: `dist` *(or `client/dist` if root).*
4. Add **Environment Variables** in Vercel:

| Variable Name | Required | Description / Example Value |
| :--- | :---: | :--- |
| `VITE_API_URL` | **Yes** | Public backend API URL ending in `/api` (e.g., `https://hbs-wear-api.onrender.com/api`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Optional fallback publishable key (`pk_test_...` or `pk_live_...`). If omitted, client dynamically fetches it from the backend. |

5. Click **Deploy**.
6. Once deployed, copy your assigned Vercel URL (e.g., `https://hbs-wear.vercel.app`) and set it as `CLIENT_URL` in your Render backend service.

---

## 6. Provider Webhooks and Callbacks Configuration

### Stripe Webhook
1. Go to **Stripe Dashboard** -> **Developers** -> **Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL**:
   ```
   https://<your-render-app>.onrender.com/api/payments/stripe/webhook
   ```
4. **Events to listen for**:
   * `payment_intent.succeeded`
   * `payment_intent.payment_failed`
5. Click **Add endpoint**.
6. Reveal the **Signing secret** (`whsec_...`) and paste it as `STRIPE_WEBHOOK_SECRET` in your Render environment variables.

### Safaricom Daraja M-Pesa Callback
1. In Safaricom Daraja Portal, ensure your app is registered with the correct shortcode.
2. In your Render backend environment variables, verify `DARAJA_CALLBACK_URL` is set to your live HTTPS domain:
   ```
   https://<your-render-app>.onrender.com/api/payments/mpesa/callback
   ```
3. Set `DARAJA_ENVIRONMENT` to `production` when using live Till/Paybill credentials (or `sandbox` for testing).

---

## 7. Recommended Deployment Order

Follow this sequence to ensure zero-downtime, properly connected deployment:

1. **Create Render PostgreSQL database** (`hbs-wear-db`).
2. **Deploy Render backend web service** (`hbs-wear-api`):
   * Populate initial environment variables (`DATABASE_URL`, `JWT_SECRET`, Cloudinary, Stripe, Daraja).
   * Set temporary `CLIENT_URL` to `http://localhost:5173` if Vercel URL is not known yet.
   * Verify the build succeeded and `https://<your-render-app>.onrender.com/health` returns `{"status":"ok","database":"connected"}`.
3. **Deploy Vercel frontend**:
   * Set `VITE_API_URL` to `https://<your-render-app>.onrender.com/api`.
   * Trigger deployment and obtain your production URL (e.g. `https://hbs-wear.vercel.app`).
4. **Link Frontend to Backend CORS**:
   * Update `CLIENT_URL` in Render to `https://hbs-wear.vercel.app`.
   * Render will automatically restart the service with the new CORS origin.
5. **Configure Stripe & Daraja Webhooks**:
   * Enter the live Render webhook URL in Stripe Dashboard and obtain `STRIPE_WEBHOOK_SECRET`.
   * Verify `DARAJA_CALLBACK_URL` points to the Render domain.

---

## 8. Database Migrations & Optional Seeding

### Applying Migrations
Migrations are applied **automatically** during Render builds via `npm run prisma:deploy`.
To run migrations manually from your local terminal against the remote database:
```bash
cd server
DATABASE_URL="<render-external-postgres-url>" npx prisma migrate deploy
```

### Seeding Test Products & Initial Admin (Optional)
Seeding is **never** run automatically in production. To intentionally seed the initial catalog and admin user:
```bash
cd server
DATABASE_URL="<render-external-postgres-url>" \
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="StrongPassword123!" \
npm run prisma:seed
```

---

## 9. Preparing a Fresh Database at Handover

When handing over the project or launching with a clean production slate:
1. **Never** delete or reset the development database.
2. In Render Dashboard, create a **fresh PostgreSQL database instance** (e.g. `hbs-wear-prod-db`).
3. Point `DATABASE_URL` on the Render backend service to the new database URL.
4. Render will trigger a build and execute `npm run prisma:deploy`, creating all 10 clean tables with exact indices and constraints.
5. If desired, create only the administrator user without test products:
   * Register via `/register` or run a targeted script to insert the primary admin user.
6. The new store will start with a clean catalog ready for production catalog management.

---

## 10. Troubleshooting & Health Verification

* **Health Check**:
  * Visit `https://<your-render-app>.onrender.com/health`.
  * Expected response: `{"status":"ok","service":"hbs-wear-api","database":"connected"}`.
* **CORS Errors (`Blocked by CORS`)**:
  * Check that `CLIENT_URL` on Render matches your exact Vercel domain without trailing slashes.
  * If using custom domains or Vercel preview URLs, add them to `ALLOWED_ORIGINS` (comma-separated).
* **SPA 404 on Page Refresh**:
  * Verified handled by `client/vercel.json` and root `vercel.json` rewrites (`/(.*) -> /index.html`).
* **Stripe Webhook Signature Verification Failed**:
  * Confirm `STRIPE_WEBHOOK_SECRET` matches the secret generated for the live Render endpoint in Stripe Dashboard.
  * Express raw body parser is mounted specifically for `/api/payments/stripe/webhook` before `express.json()`.
* **Daraja STK Push Not Reaching Phone**:
  * Confirm `DARAJA_ENVIRONMENT` matches credentials (`sandbox` vs `production`).
  * Verify `DARAJA_CALLBACK_URL` is reachable over public HTTPS (Render provides automatic SSL).
