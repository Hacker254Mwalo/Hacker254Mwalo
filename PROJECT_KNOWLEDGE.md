# Dumiropay - Comprehensive Project Guide

## 1. Overview & Purpose
Dumiropay is a decentralized GPU node infrastructure platform for Kenya. It focuses on AI compute nodes, compute dashboards, platform guidance, and account management.

**Current State:** Fully deployed on Vercel, integrated with Supabase.

## 2. Tech Stack & Architecture
- **Frontend:** React 19, Vite 8, React Router DOM, TailwindCSS v4 (using `@tailwindcss/vite` plugin)
- **Backend/Database:** Supabase (PostgreSQL)
- **Auth:** Custom authentication using Phone Number + PIN (SHA-256 hashed). Supabase Auth is disabled.
- **Hosting & Serverless:** Vercel (API routes in `/api` directory)
- **Icons:** WebP format in `/public/icons` for fast loading

## 3. Key Database Schema & Conventions (Supabase)
- **Users Table:** `phone` (primary identifier), `name`, `pin_hash`, `balance`, `bonus_balance`, `referral_code`, `referred_by`, `is_admin`.
- **Investments:** `user_phone`, `plan_id`, `plan_name`, `amount`, `daily_return`, `total_return`, `status` ('active', 'completed').
- **Atomic DB Functions (CRITICAL):** All balance updates MUST use atomic Supabase SQL functions to prevent race conditions and double-crediting.
- **App Settings:** The `app_settings` table stores WhatsApp support numbers, `stk_enabled` toggle, and `activity_enabled` toggle.
- **Activity Feed Table:** `activity_feed` stores admin-added activity entries.
- **Admin Settings:** Admin can toggle platform activity notifications from Admin → Settings tab.

## 4. Critical Security & Auth Context
- **No Supabase Auth:** The app uses `createClient` with `persistSession: false`.
- **Session Management:** Auth state is handled entirely by `AuthContext.jsx` storing the user object in localStorage/sessionStorage.
- **Admin Checks:** Always use `checkIsAdmin(phone)` or rely on RLS protected tables.

## 5. Deployment & Scripts
- **Build Command:** `npm run build` (Outputs to `/dist`)
- **Vercel Config (`vercel.json`):** Rewrites all non-API routes to `/index.html` for SPA routing.
- **API Routes:** `/api/stk-push.js`, `/api/stk-callback.js`, `/api/stk-status.js`, `/api/daily-profits.js`.

## 6. UI/UX Design Rules (Strict)
- **Theme:** Dark mode default (`#030712`), Light mode override available.
- **Colors:** Premium dark navy background with gold (`#FFD700`), emerald (`#34D399`), and blue (`#60A5FA`) accents.
- **Animations:** Use CSS keyframes for premium feel and respect `prefers-reduced-motion`.
