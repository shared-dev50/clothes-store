# HBS Wear

Ecommerce website for HBS Wear.

## Tech Stack

* React + Vite + TypeScript
* Node.js + Express + TypeScript
* PostgreSQL + Prisma

## Clone Repository

```bash
git clone https://github.com/shared-dev50/clothes-store.git
cd clothes-store
```

## Database Setup

Make sure PostgreSQL and pgAdmin 4 are installed.

Open pgAdmin 4 and create a database named:

```text
hbs_wear
```

You do not need to create any tables manually.

## Backend Setup

Open a terminal:

```bash
cd server
npm install
```

Create a file called `.env` inside the `server` folder:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/hbs_wear?schema=public"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your PostgreSQL login details.

Then create the database tables:

```bash
npx prisma migrate dev
```

Add the HBS Wear products:

```bash
npm run prisma:seed
```

Start the backend:

```bash
npm run dev
```

Backend: `http://localhost:5000`

## Frontend Setup

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Open the frontend in your browser.

## Running the Project

After the initial setup, use two terminals.

**Backend:**

```bash
cd server
npm run dev
```

**Frontend:**

```bash
cd client
npm run dev
```

The application will be available at:

`http://localhost:5173`
