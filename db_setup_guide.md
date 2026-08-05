# Market Mayhem: Final Event Deployment Guide

This guide provides the exact step-by-step instructions to host **Market Mayhem** for your final event using a free/low-cost stack: **Vercel** (Frontend), **Render** (Backend), and **Turso** (Database).

By following these instructions, your simulation will support real-time WebSockets and cloud database syncing perfectly.

---

## Step 1: Push Your Code to GitHub
Before deploying anything, ensure your entire `eunoia-stocks` project is pushed to a repository on your GitHub account. Both Vercel and Render will pull your code directly from there.

---

## Step 2: Set Up Turso (The Cloud Database)
We need a cloud database so that your backend has a persistent place to store game state, users, and transactions.

1. Go to [Turso.tech](https://turso.tech/) and sign up for a free account.
2. In the Turso dashboard, click **Create Database**. Name it `market-mayhem`.
3. Once created, click on your database and find the **Connection String** (it will look like `libsql://market-mayhem-...turso.io`). Save this somewhere; it's your `DATABASE_URL`.
4. Click **Generate Token** (or Create Token) to get your database authentication token. Save this; it's your `DATABASE_AUTH_TOKEN`.

---

## Step 3: Deploy the Backend to Render
Render will run your Node.js server and keep the WebSocket connections alive for real-time synchronization.

1. Go to [Render.com](https://render.com/) and sign up / log in.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `eunoia-stocks` repository.
4. Fill out the configuration exactly as follows:
   - **Name**: `market-mayhem-backend`
   - **Root Directory**: `backend` *(CRITICAL: DO NOT LEAVE THIS BLANK)*
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Scroll down to **Environment Variables** and add the following:
   - `DATABASE_URL` = (Paste your Turso Connection String from Step 2)
   - `DATABASE_AUTH_TOKEN` = (Paste your Turso Auth Token from Step 2)
   - `PORT` = `5001`
6. Click **Create Web Service**.
7. Wait a few minutes for Render to build and deploy. Once successful, you will see a URL at the top (e.g., `https://market-mayhem-backend.onrender.com`). **Save this URL.**

### Seed the Production Database
Since **Turso** is a cloud database, you do **NOT** need to use Render's Shell tab (which requires a paid Render plan). Your Turso cloud database has already been seeded remotely!

If you ever need to re-seed or reset your production database in the future, simply run this from your local terminal:
```bash
cd backend
npm run seed
```
This connects directly to your Turso cloud database and populates it instantly.

---

## Step 4: Deploy the Frontend to Vercel
Vercel will host the React frontend and serve it to your users.

1. Go to [Vercel.com](https://vercel.com/) and log in with GitHub.
2. Click **Add New...** -> **Project**.
3. Import your `eunoia-stocks` repository.
4. Configure the Project:
   - **Framework Preset**: `Vite` (Vercel usually auto-detects this).
   - **Root Directory**: `frontend` *(CRITICAL: Click Edit and type `frontend`, do not leave it blank).*
5. Open the **Environment Variables** accordion and add the following:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-render-url.onrender.com/api` *(Replace with your actual Render URL from Step 3, make sure you append `/api`)*
   - **Name**: `VITE_SOCKET_URL`
   - **Value**: `https://your-render-url.onrender.com` *(Just the base URL, NO `/api`)*
6. Click **Deploy**.
7. Vercel will build and assign you a live domain (e.g., `https://market-mayhem.vercel.app`).

---

## Step 5: Test the Live Setup!
1. Go to your new Vercel URL.
2. Log in as **admin / admin123** on one browser tab.
3. Log in as a trader (e.g., **team_alpha / password123**) in a different tab or browser.
4. In the Admin dashboard, trigger a **News Event** or change a stock price.
5. Verify that the changes appear *instantly* on the trader's dashboard without needing to refresh.

**You are now fully ready to run your competition!**
