# Dumiropay — Kenya's Premier AI Node Earnings Platform

A modern React + Vite + Tailwind CSS AI compute node platform for Kenya, featuring M-Pesa integration, referral system, and daily AI compute yields.

## 🚀 Features

- **Dark Premium UI** — Red/pink accent theme, fully responsive
- **Phone Authentication** — Register/Login with Kenyan phone number + PIN
- **Dashboard** — Balance display, daily login bonus (+KSh 50), Lucky Spin (Mon & Fri)
- **AI Compute Node Plans** — 10 plans from KSh 200 to KSh 45,000 @ 3% daily yield / 90-day duration
- **M-Pesa Recharge** — Paybill **4091165**
- **Withdrawal** — 24/7 withdrawals directly to M-Pesa, 8% processing fee
- **Referral System** — 10% Level 1 & 4% Level 2 commission on first deposit
- **Node Earnings History** — Full portfolio tracking
- **LocalStorage** — Data persistence (Supabase-ready via env vars)

## 🛠 Tech Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router v7**
- **Supabase** (optional — configure via `.env`)

## 📦 Setup

```bash
npm install
npm run dev
```

## ⚙️ Environment Variables (Optional)

Copy `.env.example` to `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these, the app runs fully on **localStorage**.

## 📱 M-Pesa Recharge

- Lipa na M-Pesa → Paybill
- Business No: **4091165**
- Account No: Your phone number

