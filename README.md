# Dumiropay — Kenya's AI Compute Platform

A modern React + Vite + Tailwind CSS AI compute platform for Kenya, focused on GPU node infrastructure, model training, and distributed inference.

## Features

- **Dark Premium UI** — Gold, emerald, and blue accent theme, fully responsive
- **Phone Authentication** — Register/Login with Kenyan phone number + PIN
- **Dashboard** — Account overview, platform activity, and profile management
- **AI Compute Node Plans** — Compute options for different workloads and capacities
- **Platform Support** — Clear guidance and support pages
- **Profile & Activity** — User settings and recent activity views
- **LocalStorage** — Data persistence (Supabase-ready via env vars)

## Tech Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router v7**
- **Supabase** (optional — configure via `.env`)

## Setup

```bash
npm install
npm run dev
```

## Environment Variables (Optional)

Copy `.env.example` to `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these, the app runs fully on **localStorage**.
