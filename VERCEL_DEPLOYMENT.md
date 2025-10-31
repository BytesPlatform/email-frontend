# 🚀 Vercel Deployment Guide

## Quick Steps to Deploy Frontend to Vercel

### Prerequisites
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ GitHub/GitLab/Bitbucket repository with your frontend code
- ✅ Backend deployed on Render (already done: `https://email-backend-izs4.onrender.com`)

### Step 1: Install Vercel CLI (Optional - for local testing)
```bash
npm i -g vercel
```

### Step 2: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New Project"**
3. **Import your Git repository** (email-frontend folder)
   - If your frontend is in a subfolder, configure the root directory as `email-frontend`
4. **Configure Project Settings:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `email-frontend` (if frontend is in subfolder)
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install`

### Step 3: Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

#### For All Environments (Production, Preview, Development):
```
NEXT_PUBLIC_API_URL=https://email-backend-izs4.onrender.com
```

**Important:** Use the Render URL for Vercel deployments so all deployed versions (production, preview, development) connect to your Render backend.

### Step 4: Deploy

- Click **"Deploy"**
- Vercel will automatically:
  - Install dependencies
  - Build your Next.js app
  - Deploy to a unique URL

### Step 5: Update Render CORS (If Needed)

Make sure your Render backend allows requests from your Vercel domain:
- In Render dashboard, set `FRONTEND_URL` environment variable to your Vercel domain:
  - Production: `https://your-app.vercel.app`
  - Or use wildcard: `https://*.vercel.app` (allows all Vercel preview deployments)

---

## Deploy via CLI (Alternative)

```bash
cd email-frontend
vercel login
vercel
```

Then set environment variables:
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://email-backend-izs4.onrender.com

vercel env add NEXT_PUBLIC_API_URL preview
# Enter: https://email-backend-izs4.onrender.com

vercel env add NEXT_PUBLIC_API_URL development
# Enter: https://email-backend-izs4.onrender.com
```

---

## Environment Configuration Summary

### Local Development (`npm run dev`)
- **Backend:** `http://localhost:3000` (default, no env var needed)
- Used for: Local development and testing

### Local Production Testing (`npm run build && npm start`)
- **Backend:** `http://localhost:3000` (default, no env var needed)
- Used for: Testing production build locally

### Vercel Deployments (All Environments)
- **Backend:** `https://email-backend-izs4.onrender.com`
- Set via: `NEXT_PUBLIC_API_URL` environment variable in Vercel
- Used for: Production, Preview, and Development deployments on Vercel

---

## How It Works

The `ApiClient` automatically handles environment detection:

1. **If `NEXT_PUBLIC_API_URL` is set:** Uses that value (for Vercel)
2. **If running in browser (client-side) without env var:** Uses Render URL as default
3. **If running server-side without env var:** Uses localhost (for local development)

This means:
- ✅ Local development works out of the box
- ✅ Local production testing uses localhost
- ✅ Vercel deployments use Render (via environment variable)

---

## Custom Domain (Optional)

If you want a custom domain:

1. **In Vercel Dashboard:** Settings → Domains
2. **Add your domain** (e.g., `email.yourdomain.com`)
3. **Update DNS records** as instructed by Vercel
4. **Update Render CORS:** Set `FRONTEND_URL` to your custom domain

---

## Troubleshooting

### Build Errors
- Check that all dependencies are in `package.json`
- Verify `next.config.ts` is valid
- Check build logs in Vercel dashboard

### API Connection Errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check Render backend is running and accessible
- Verify CORS settings in Render backend allow your Vercel domain

### Environment Variables Not Working
- `NEXT_PUBLIC_*` variables must be set before build
- Redeploy after adding/modifying environment variables
- Variables are available in browser (client-side)

---

## Next Steps After Deployment

1. ✅ Test your deployed frontend
2. ✅ Verify API calls are working
3. ✅ Test authentication flow
4. ✅ Update any documentation with your Vercel URL
5. ✅ Set up custom domain (optional)

---

**Your frontend is ready for Vercel! 🎉**

