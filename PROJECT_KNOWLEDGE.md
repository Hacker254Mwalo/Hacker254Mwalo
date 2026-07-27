# Dumiropay - Comprehensive Project Guide

## 1. Overview & Purpose
Dumiropay is a decentralized GPU node infrastructure platform for Kenya. It allows users to invest in AI compute nodes, earn daily yield, claim 2% of active investment shares as daily bonuses, perform lucky spins, and withdraw directly to M-Pesa.

**Current State:** Fully deployed on Vercel, integrated with Supabase, using M-Pesa STK push for deposits and withdrawals.

## 2. Tech Stack & Architecture
- **Frontend:** React 19, Vite 8, React Router DOM, TailwindCSS v4 (using `@tailwindcss/vite` plugin)
- **Backend/Database:** Supabase (PostgreSQL)
- **Auth:** Custom authentication using Phone Number + PIN (SHA-256 hashed). Supabase Auth is disabled.
- **Hosting & Serverless:** Vercel (API routes in `/api` directory)
- **Icons:** WebP format in `/public/icons` for fast loading

## 3. Key Database Schema & Conventions (Supabase)
- **Users Table:** `phone` (primary identifier), `name`, `pin_hash`, `balance`, `bonus_balance`, `referral_code`, `referred_by`, `is_admin`.
- **Investments:** `user_phone`, `plan_id`, `plan_name`, `amount`, `daily_return`, `total_return`, `status` ('active', 'completed').
- **Atomic DB Functions (CRITICAL):** All balance updates MUST use atomic Supabase SQL functions (e.g., `atomic_invest`, `atomic_approve_deposit`, `atomic_withdraw`, `claim_daily_login_bonus`) to prevent race conditions and double-crediting. **Never write direct `.update()` calls on the `users` table for balances.**
- **App Settings:** The `app_settings` table stores WhatsApp support numbers and the `stk_enabled` toggle. It uses Row Level Security (RLS) - direct client writes are blocked. Updates must go through the `update_app_setting` RPC function which checks for admin status.

## 4. Critical Security & Auth Context
- **No Supabase Auth:** The app uses `createClient` with `persistSession: false`.
- **Session Management:** Auth state is handled entirely by `AuthContext.jsx` storing the user object in localStorage/sessionStorage.
- **Admin Checks:** Always use `checkIsAdmin(phone)` or rely on RLS protected tables.

## 5. Deployment & Scripts
- **Build Command:** `npm run build` (Outputs to `/dist`)
- **Vercel Config (`vercel.json`):** Rewrites all non-API routes to `/index.html` for SPA routing. Scheduled a cron job for `/api/daily-profits` at midnight.
- **API Routes:** `/api/stk-push.js`, `/api/stk-callback.js`, `/api/stk-status.js`, `/api/daily-profits.js`.

## 6. UI/UX Design Rules (Strict)
- **Theme:** Dark mode default (`#030712`), Light mode override available.
- **Colors:** Premium dark navy background with gold (`#FFD700`), emerald (`#34D399`), and blue (`#60A5FA`) accents.
- **Animations:** Use CSS keyframes for premium feel (e.g., `goldHeartbeat`, `glowPulse`, `aiPulse`). Always respect `prefers-reduced-motion`.
- **Balance Card:** **NEVER MODIFY** the structure or math of the `balance-gradient` card unless explicitly instructed. It has a specific shimmer, glow, and particle animation.

## 7. Common Pitfalls & "Gotchas" to Avoid
1. **Balance Updates:** NEVER use `supabase.from('users').update({ balance: ... })`. ALWAYS use the exported atomic RPCs in `src/lib/db.js` (e.g., `adminSetBonusBalance`, `approveDeposit`).
2. **Icons:** New icons MUST be saved as WebP (`stat-yield.webp`, etc.) in `/public/icons` for performance.
3. **Tailwind v4:** Do not use `tailwind.config.js`. Tailwind is configured via Vite plugin. Custom CSS goes in `src/index.css` using `@layer components`.
4. **Login Page:** The feature cards (`AI Yield`, `24/7`, `Instant Node`) now have specific gold/emerald/blue themed gradients and a `goldHeartbeat` animation class.
5. **Dashboard Text:** The Daily Compute Bonus subtitle reads exactly: `Claim +2% of your investment shares` (with "+2%" highlighted in gold).

## 8. Recent Changes (Context for next session)
- Enabled Row Level Security (RLS) on `app_settings` table.
- Replaced login page feature icons with premium gold coins (AI brain, clock, server chip).
- Added `goldHeartbeat` and `glowPulse` animations to login feature cards.
- Themed the 3 login feature cards with specific colors (Gold, Emerald, Blue).
- Updated Dashboard Daily Compute Bonus subtitle to "Claim +2% of your investment shares".
- Added STK push toggle to Admin Settings.
