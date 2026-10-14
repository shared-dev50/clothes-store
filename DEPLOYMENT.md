# HBS Wear — Manual Production Deployment Guide (Render & Vercel)

This guide documents the complete, manual step-by-step procedure for deploying the HBS Wear application to production using **Render** (Node.js API & Managed PostgreSQL) and **Vercel** (React/Vite SPA).

---

## 1. Architecture & Deployment Model

* **Backend Service**: Node.js + Express 5 + TypeScript + Prisma ORM, deployed manually as a **Render Web Service**.
* **Database**: Managed **Render PostgreSQL** database.
* **Frontend SPA**: React 19 + Vite + TypeScript, deployed on **Vercel**.
* **Media Assets**: Cloudinary (Product images and homepage banners).
* **Payment Gateways**:
  * **Stripe**: Card payments via PaymentIntents with server-side webhook signature verification.
  * **Safaricom Daraja M-Pesa**: STK Push prompts with server-side asynchronous JSON callbacks.
* **Background Worker**: In-process `node-cron` job sweeping expired stock reservations every minute.

---

## 2. Understanding Render Service Naming

When deploying on Render:
1. **Web Service Names Must Be Globally Unique**:
   * Every Render Web Service receives a public URL: `https://<service-name>.onrender.com`.
   * The subdomain `<service-name>` is registered across the entire global Render platform.
   * If Render displays a **"Name in use"** error, someone on Render (or another service previously created under your account) has already claimed that name.
   * **Solution**: Add a unique suffix or identifier (e.g. `hbs-wear-api-mgk` or `hbs-wear-api-<yourname>`).
2. **PostgreSQL Names**:
   * The database instance name (e.g. `hbs-wear-db` or `hbs-wear-db-mgk`) only needs to be unique within your Render account or team.

---

## 3. Step 1: Create the Render PostgreSQL Database

1. Log in to the **[Render Dashboard](https://dashboard.render.com/)**.
2. Click **New +** (top right) and select **PostgreSQL**.
3. Fill in the database details:
   * **Name**: `hbs-wear-db-mgk` (or any descriptive name you prefer).
   * **Database**: `hbs_wear`
   * **User**: `hbs_wear_user`
   * **Region**: Choose the region closest to your target users (e.g. Frankfurt or London for lowest latency to Kenya; or Oregon/Ohio).
   * **PostgreSQL Version**: `16` (default).
   * **Plan**: `Free` or `Starter`.
4. Click **Create Database**.
5. Once provisioned, locate the **Connections** panel:
   * **Internal Database URL**: Use this value for the Render web service (`DATABASE_URL`). It enables fast, secure internal communication within Render's private network with zero egress bandwidth costs.
   * **External Database URL**: Save this for remote operations (e.g. running manual migration checks or optional test seeding from your local machine).

---

## 4. Step 2: Create the Render Backend Web Service

1. In the **Render Dashboard**, click **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your GitHub repository.
3. Configure the exact manual service settings:
   * **Name**: Choose an available unique name, e.g. `hbs-wear-api-mgk` (your public URL will be `https://hbs-wear-api-mgk.onrender.com`).
   * **Region**: **Must be the same region** as your PostgreSQL database created in Step 1.
   * **Branch**: `main` (or your deployment branch).
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npm run build && npm run prisma:deploy
     ```
     *This command installs dependencies, generates the Prisma Client (`prisma generate`), compiles TypeScript to `dist/` (`tsc`), and safely applies all 10 Prisma database migrations (`prisma migrate deploy`) without interactive prompts.*
   * **Start Command**:
     ```bash
     npm start
     ```
     *Runs `node dist/index.js`, binding to `0.0.0.0:$PORT`.*
   * **Health Check Path**: `/health`
     *Returns HTTP 200 `{"status":"ok","service":"hbs-wear-api","database":"connected"}`.*
   * **Auto-Deploy**: `Yes` (automatically redeploys when you push to GitHub).
   * **Plan**: `Free` or `Starter`.

---

## 5. Step 3: Configure Backend Environment Variables (Render)

In your Render Web Service settings, navigate to **Environment** -> **Add Environment Variable**, and populate the following:

| Variable Name | Required | Example / Description |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | `production` |
| `DATABASE_URL` | **Yes** | Paste the **Internal Database URL** from Step 1 (`postgresql://...`) |
| `CLIENT_URL` | **Yes** | Production Vercel URL without trailing slash: `https://hbs-wear.vercel.app` *(set temporary `http://localhost:5173` if Vercel URL is not yet created)* |
| `ALLOWED_ORIGINS` | No | Comma-separated list of extra allowed origins (e.g. custom domain, Vercel preview URLs) |
| `JWT_SECRET` | **Yes** | High-entropy random string (min 32 chars). Generate in terminal: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | No | Initial admin email (used only if running optional seed script) |
| `ADMIN_PASSWORD` | No | Initial admin password (used only if running optional seed script) |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Your Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | **Yes** | Your Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | **Yes** | Your Cloudinary API Secret |
| `CLOUDINARY_FOLDER` | No | Default: `hbs-wear/products` |
| `STRIPE_SECRET_KEY` | **Yes** | `sk_live_...` (or `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | **Yes** | `pk_live_...` (or `pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Webhook secret from Stripe Dashboard (`whsec_...`) |
| `DARAJA_CONSUMER_KEY` | **Yes** | Safaricom Daraja Consumer Key |
| `DARAJA_CONSUMER_SECRET`| **Yes** | Safaricom Daraja Consumer Secret |
| `DARAJA_SHORTCODE` | **Yes** | Paybill or Till number (Sandbox default: `174379`) |
| `DARAJA_PASSKEY` | **Yes** | Lipa Na M-Pesa Online passkey |
| `DARAJA_CALLBACK_URL` | **Yes** | Full public callback URL: `https://<your-render-service>.onrender.com/api/payments/mpesa/callback` |
| `DARAJA_ENVIRONMENT` | **Yes** | `sandbox` (for testing) or `production` (live) |

Click **Save Changes**. Render will trigger the initial build.

---

## 6. Step 4: Deploy the Frontend on Vercel

1. Log in to the **[Vercel Dashboard](https://vercel.com/)**.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure the Vercel project:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click **Edit** and select `client` *(Recommended)*.
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Under **Environment Variables**, add:

| Variable Name | Required | Value / Description |
| :--- | :---: | :--- |
| `VITE_API_URL` | **Yes** | `https://<your-render-service>.onrender.com/api` *(Must end with `/api`, no trailing slash)* |
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Optional fallback publishable key (`pk_live_...` or `pk_test_...`). If omitted, client dynamically fetches it from the backend. |

6. Click **Deploy**.
7. Once deployed, copy your assigned Vercel domain (e.g. `https://hbs-wear.vercel.app`).

### SPA Routing on Vercel
Vercel is automatically configured via [client/vercel.json](file:///Users/MGK/Documents/projects/clothes-store/client/vercel.json) with rewrite rules (`/(.*) -> /index.html`), preventing 404 errors when users refresh deep routes such as `/admin/products`, `/shop`, or `/checkout`.

---

## 7. Step 5: Link Frontend Domain to Backend CORS

Now that your production frontend domain is known:
1. Return to the **Render Dashboard** -> **Web Service** -> **Environment**.
2. Update `CLIENT_URL` to your live Vercel domain:
   ```
   https://hbs-wear.vercel.app
   ```
   *(Ensure there is no trailing slash).*
3. If you have custom domains or Vercel preview environments, add them to `ALLOWED_ORIGINS` (comma-separated):
   ```
   https://hbswear.com,https://www.hbswear.com
   ```
4. Click **Save Changes**. Render will automatically restart the web service with updated CORS policies.

---

## 8. Step 6: Configure Payment Webhooks and Callbacks

### Stripe Webhook (Production & Test Mode)
1. In the **[Stripe Dashboard](https://dashboard.stripe.com/)**, navigate to **Developers** -> **Webhooks**.
2. Click **Add endpoint**.
3. Set **Endpoint URL** to:
   ```
   https://<your-render-service>.onrender.com/api/payments/stripe/webhook
   ```
4. Select events to listen for:
   * `payment_intent.succeeded`
   * `payment_intent.payment_failed`
5. Click **Add endpoint**.
6. Reveal the **Signing secret** (`whsec_...`) and update `STRIPE_WEBHOOK_SECRET` in your Render Environment Variables.

### Safaricom Daraja M-Pesa Callback
1. In the Safaricom Developer Portal, ensure your app uses your live Till/Paybill number.
2. In your Render backend Environment Variables, verify:
   * `DARAJA_CALLBACK_URL` is set to:
     ```
     https://<your-render-service>.onrender.com/api/payments/mpesa/callback
     ```
   * `DARAJA_ENVIRONMENT` is set to `sandbox` during testing and `production` when live credentials are supplied.

---

## 9. Database Migrations & Optional Test Seeding

### Applying Migrations
During every Render build, `npm run prisma:deploy` executes `prisma migrate deploy` against `DATABASE_URL`. This automatically creates or updates tables in chronological order without prompting.

To run migrations manually from your local terminal against the remote database:
```bash
cd server
DATABASE_URL="<render-external-postgres-url>" npx prisma migrate deploy
```

### Seeding Test Data (Optional)
Seeding is decoupled and **never runs automatically**. To populate initial test products and an administrator account:
```bash
cd server
DATABASE_URL="<render-external-postgres-url>" \
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="YourStrongPassword123!" \
npm run prisma:seed
```

---

## 10. Smoke Tests & Verification

Once deployed, run these verification tests against your live endpoints:

1. **Health Check**:
   ```bash
   curl -i https://<your-render-service>.onrender.com/health
   ```
   Expected response:
   ```json
   HTTP/2 200
   {"status":"ok","service":"hbs-wear-api","timestamp":"...","database":"connected"}
   ```

2. **Public Product Listing**:
   ```bash
   curl -i https://<your-render-service>.onrender.com/api/products
   ```
   Expected response: HTTP 200 with JSON array of products.

3. **Homepage Settings**:
   ```bash
   curl -i https://<your-render-service>.onrender.com/api/homepage-settings
   ```
   Expected response: HTTP 200 with hero image URLs and layout configuration.

4. **Frontend SPA Navigation**:
   Open `https://<your-vercel-domain>` in your browser.
   * Verify the hero image renders cleanly without flash.
   * Navigate to `/shop`, `/product/<slug>`, and `/login`.
   * Refresh the browser on `/admin/products` to confirm SPA rewrites operate correctly.

---

## 11. Security Checklist Before Launch

* [ ] `.env` files are not tracked in git (verified by `.gitignore`).
* [ ] `JWT_SECRET` is a strong random secret generated specifically for production.
* [ ] `DATABASE_URL` uses Render's internal database URL on the web service.
* [ ] `CLIENT_URL` matches your exact Vercel production domain.
* [ ] Stripe webhook secret matches the endpoint registered in Stripe Dashboard.
* [ ] Daraja callback URL uses public HTTPS on Render.
* [ ] Admin credentials are changed from defaults before handover.
