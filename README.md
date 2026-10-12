# HBS Wear

An e-commerce website for HBS Wear, built with React, Node.js, Express, PostgreSQL, and Prisma. The application supports Stripe test-mode card payments.

## Tech Stack

* **Frontend:** React, Vite, TypeScript
* **Backend:** Node.js, Express, TypeScript
* **Database:** PostgreSQL, Prisma ORM
* **Payments:** Stripe (test mode)

## Prerequisites

Install the following before setting up the project:

* [Node.js](https://nodejs.org/) (LTS recommended)
* [PostgreSQL](https://www.postgresql.org/download/)
* [pgAdmin 4](https://www.pgadmin.org/download/)
* [Git](https://git-scm.com/downloads)
* [Stripe CLI](https://docs.stripe.com/stripe-cli)

You will also need a free [Stripe account](https://dashboard.stripe.com/register) to obtain test API keys.

## 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/shared-dev50/clothes-store.git
cd clothes-store
```

## 2. Database Setup

Make sure PostgreSQL is installed and running.

1. Open pgAdmin 4.
2. Connect to your local PostgreSQL server.
3. Right-click **Databases** and select **Create → Database**.
4. Name the database:

```text
hbs_wear
```

5. Save the database.

You do not need to create any tables manually. Prisma will create them during migration.

## 3. Backend Setup

Open a terminal in the project directory and run:

```bash
cd server
npm install
```

### Configure the backend environment

Create a file named `.env` inside the `server` folder.

Add the following configuration:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/hbs_wear?schema=public"

PORT=5000

CLIENT_URL="http://localhost:5173"
```

Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your PostgreSQL username and password.

If your PostgreSQL server uses a different port, update the connection URL accordingly. If your password contains special characters, URL-encode them in the database connection string.

### Create the database tables

Run the following commands from inside the `server` folder:

```bash
npx prisma migrate dev
npm run prisma:seed
```

The first command creates the database tables using the project's migrations. The second adds the initial HBS Wear products.

If Prisma reports that there are no migrations or the seed command is unavailable, check the project's Prisma configuration and `package.json` scripts before proceeding.

## 4. Set Up Stripe Test Payments

Stripe lets you test card payments without charging real money.

### Step 1: Create or sign in to your Stripe account

Go to:

**https://dashboard.stripe.com/register**

If you already have an account, sign in at:

**https://dashboard.stripe.com/**

Use your own account if you are setting up the project on a different computer.

### Step 2: Switch to test mode

Open the Stripe Dashboard and enable **Test mode** using the test-mode switch in the dashboard.

Test mode is separate from live payments. Make sure you obtain test keys, not live keys.

### Step 3: Get your Stripe API keys

Open the Stripe API keys page:

**https://dashboard.stripe.com/test/apikeys**

You should find two important keys:

* **Publishable key:** starts with `pk_test_`
* **Secret key:** starts with `sk_test_`

If Stripe asks you to reveal or create a secret key, follow its prompts.

**Important:** Never share your secret key, put it in frontend code, or commit it to GitHub. The publishable key is intended for frontend use; the secret key must remain on the backend.

### Step 4: Add Stripe keys to the backend

Open `server/.env` and add these variables alongside your existing database configuration:

```env
STRIPE_SECRET_KEY="sk_test_REPLACE_WITH_YOUR_SECRET_KEY"
STRIPE_WEBHOOK_SECRET="whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET"
STRIPE_PUBLISHABLE_KEY="pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY"
```

Replace the example values with your own Stripe test credentials. Do not use the example placeholders as actual keys.

### Step 5: Add the publishable key to the frontend

Create a file named `.env` inside the `client` folder.

Add:

```env
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY"
```

Use the same Stripe test-mode publishable key you configured for the backend.

### Step 6: Install and authenticate the Stripe CLI

Follow the official installation instructions for your operating system:

https://docs.stripe.com/stripe-cli

After installation, open a terminal and run:

```bash
stripe login
```

Follow the instructions to authenticate the CLI with your Stripe account.

### Step 7: Start the local Stripe webhook listener

Start the backend first, as described in the next section, so that the webhook endpoint is available.

Open another terminal and run:

```bash
stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:5000/api/payments/stripe/webhook
```

The CLI will display a webhook signing secret beginning with `whsec_`.

Copy that **local webhook signing secret** into `STRIPE_WEBHOOK_SECRET` in `server/.env`.

Do not use your Stripe API secret key as the webhook signing secret. They are different credentials.

Restart the backend after updating the environment variables.

**Keep the Stripe CLI listener running while testing payments.** Its local signing secret is for this development listener; production deployments require their own webhook endpoint and signing secret.

## 5. Start the Backend

Open a terminal and run:

```bash
cd server
npm install
npm run dev
```

The backend should be available at:

http://localhost:5000

Keep this terminal running.

## 6. Start the Frontend

Open a second terminal from the project root:

```bash
cd client
npm install
npm run dev
```

The frontend should be available at:

http://localhost:5173

Keep this terminal running as well.

If you change environment variables after starting the application, restart the affected development server.

## 7. Run the Complete Application

You will generally need three running terminals:

**Terminal 1: Backend**

```bash
cd server
npm run dev
```

**Terminal 2: Frontend**

```bash
cd client
npm run dev
```

**Terminal 3: Stripe webhook listener**

```bash
stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:5000/api/payments/stripe/webhook
```

Make sure PostgreSQL is running before starting the application.

Open the website in your browser:

http://localhost:5173

## 8. Test a Stripe Payment

1. Open the website.
2. Add a product to your cart.
3. Proceed to checkout.
4. Enter the required checkout and billing details.
5. Use the following Stripe test card:

| Field           | Test value                |
| --------------- | ------------------------- |
| Card number     | `4242 4242 4242 4242`     |
| Expiry date     | Any future month and year |
| CVC             | Any three-digit number    |
| Billing details | Use test information      |

Submit the payment and wait for the application to confirm the order.

This card is for Stripe test mode only. Never enter real card details when testing.

### Verify the result

After a successful test payment, check that:

* The checkout displays the appropriate payment/order confirmation.
* The order and payment status are updated in the database.
* Stock is deducted correctly and only once.
* The Stripe CLI shows the webhook events being received.

For a declined-payment test, consult Stripe's official testing documentation:

https://docs.stripe.com/testing

## 9. Troubleshooting

### Database connection fails

* Confirm PostgreSQL is running.
* Confirm the `hbs_wear` database exists.
* Check the username, password, and port in `server/.env`.
* Run Prisma commands from the `server` directory.

### Products are missing

Run the seed command from the `server` directory:

```bash
npm run prisma:seed
```

### Stripe checkout fails

* Confirm that the frontend and backend are running.
* Check that both Stripe keys belong to the same account and test mode.
* Confirm that the backend has the correct `STRIPE_SECRET_KEY`.
* Confirm that the frontend has the correct `VITE_STRIPE_PUBLISHABLE_KEY`.
* Check that the Stripe CLI is authenticated and its listener is running.
* Confirm that the `STRIPE_WEBHOOK_SECRET` matches the secret printed by the current local listener.
* Check the backend terminal, browser console, and Stripe CLI output for errors.

### Changes to environment variables have no effect

Restart the relevant development server after changing its `.env` file.

### Stripe CLI is not recognized

Confirm that the Stripe CLI is installed correctly and available in your terminal's PATH. Reopen the terminal after installation if necessary.

## 10. Security Notes

* Never commit `.env` files or credentials to GitHub.
* Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the backend only.
* Only use Stripe test-mode credentials for local payment testing.
* Never disable webhook signature verification to get a payment working.
* Do not use real customer card details in test mode.
* For production, configure your live Stripe keys and production webhook separately and securely.

## Official Resources

* HBS Wear repository: https://github.com/shared-dev50/clothes-store
* Stripe Dashboard: https://dashboard.stripe.com/
* Stripe test API keys: https://dashboard.stripe.com/test/apikeys
* Stripe CLI installation: https://docs.stripe.com/stripe-cli
* Stripe testing cards: https://docs.stripe.com/testing
* PostgreSQL downloads: https://www.postgresql.org/download/
* Node.js downloads: https://nodejs.org/
