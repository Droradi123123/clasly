# Production Deployment Plan

A step-by-step plan for deploying Clasly to production: **Database**, **Edge Functions**, **PayPal**, and **Frontend via Git push to Vercel**.

---

## Prerequisites (one-time setup)

- Supabase CLI: `npx supabase --version` (runs via npx, no global install needed)
- Vercel CLI (optional): `npm i -g vercel` — or rely on GitHub→Vercel auto-deploy
- Supabase project linked: `npx supabase link --project-ref gctdhjgxrshrltbntjqj`
- Logged into Supabase: `npx supabase login`
- Project connected to GitHub and imported in Vercel
- Environment variables set in Vercel (see [Vercel env vars](#6-vercel-environment-variables))

---

## 1. Database (full schema)

### Option A: Migrations (recommended)

From project root:

```bash
npx supabase db push
```

If this fails (e.g. first deploy, manual schema used before), use Option B.

### Option B: Manual schema (if migrations are not applicable)

1. Supabase Dashboard → **SQL Editor**
2. Copy contents of `docs/manual-schema-setup.sql`
3. Run the script in the SQL Editor

---

## 2. Supabase Edge Functions (AI & utilities)

Deploy all non-PayPal Edge Functions:

```bash
npm run deploy:functions
```

This deploys:

- `generate-slides`
- `chat-builder`
- `generate-image`
- `parse-presentation`
- `convert-to-images`
- `ensure-user-credits`

### Required Supabase Secrets (AI)

In **Supabase Dashboard** → **Edge Functions** → **Secrets**:

| Secret              | Description              |
|---------------------|--------------------------|
| `GEMINI_API_KEY`    | Gemini API key for AI    |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase.

---

## 3. PayPal Edge Functions

Deploy PayPal-related Edge Functions:

```bash
npm run deploy:paypal
```

This deploys:

- `create-checkout-session`
- `create-credits-checkout`
- `capture-paypal-order`
- `paypal-webhook`

### Required Supabase Secrets (PayPal)

In **Supabase Dashboard** → **Edge Functions** → **Secrets**:

| Secret              | Description                                      |
|---------------------|--------------------------------------------------|
| `PAYPAL_CLIENT_ID`  | PayPal app Client ID                             |
| `PAYPAL_SECRET_KEY` | PayPal app Secret                                |
| `PAYPAL_WEBHOOK_ID` | Webhook ID from PayPal Developer (for webhook)   |
| `PAYPAL_MODE`       | `sandbox` or `live`                              |

### PayPal webhook setup (production)

1. Deploy `paypal-webhook` first (`npm run deploy:paypal`).
2. In **PayPal Developer** → your app → **Webhooks** → Add webhook.
3. **Webhook URL:**
   ```
   https://gctdhjgxrshrltbntjqj.supabase.co/functions/v1/paypal-webhook
   ```
4. Event types (at minimum):
   - `Checkout order approved`
   - `Payment capture completed`
   - `Billing subscription cancelled`
   - `Billing subscription suspended`
5. Copy the **Webhook ID** and add it as `PAYPAL_WEBHOOK_ID` in Supabase Edge Functions Secrets.

---

## 4. Frontend via Git push to Vercel

### Option A: Git push (automatic deploy)

```bash
git add .
git commit -m "Deploy updates"
git push origin main
```

Vercel builds and deploys when the connected branch (e.g. `main`) is pushed.

### Option B: Vercel CLI (manual deploy)

```bash
vercel --prod
```

---

## 5. Vercel Environment Variables

In **Vercel** → **Project** → **Settings** → **Environment Variables**:

| Name                         | Value                          | Environments          |
|-----------------------------|--------------------------------|------------------------|
| `VITE_SUPABASE_URL`         | `https://gctdhjgxrshrltbntjqj.supabase.co` | Production, Preview, Dev |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key from Supabase API settings   | Production, Preview, Dev |

---

## 6. Full deployment (all-in-one)

From project root:

```bash
# 1. Database migrations
npx supabase db push

# 2. AI & utility Edge Functions
npm run deploy:functions

# 3. PayPal Edge Functions
npm run deploy:paypal

# 4. Frontend (choose one)
git add . && git commit -m "Deploy updates" && git push origin main
# OR: vercel --prod
```

Or use the project script:

```bash
npm run deploy:prod
```

To skip database migrations (e.g. after manual schema):

```bash
npm run deploy:prod:no-db
```

---

## 7. Verification checklist

- [ ] Database: tables exist, RLS and policies work
- [ ] Edge Functions: all deployed in Supabase Dashboard → Edge Functions
- [ ] PayPal: checkout starts, capture completes, webhook receives events
- [ ] Frontend: builds on Vercel and loads without 401/500
- [ ] Auth: login/signup works and Supabase client connects

---

## 8. Common issues

| Issue                  | Action                                                        |
|------------------------|---------------------------------------------------------------|
| `db push` fails        | Run `docs/manual-schema-setup.sql` manually, then `--skip-db` |
| 401 on Edge Functions  | Ensure `Authorization: Bearer <session.access_token>` is sent |
| PayPal webhook 401     | Set `PAYPAL_WEBHOOK_ID` in Supabase Secrets                   |
| Vercel build fails     | Check env vars and build logs                                 |
| No Supabase connection | Confirm `VITE_SUPABASE_*` env vars in Vercel                  |
