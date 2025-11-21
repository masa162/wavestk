# wavestk Deployment Guide

## Prerequisites

- Cloudflare account
- Wrangler CLI installed
- R2 bucket created: `wavestk-audio`
- D1 database created: `wavestk-db`
- D1 migration executed

## Step 1: Deploy CDN Worker

```bash
cd /d/github/wavestk
npx wrangler deploy --config worker/wrangler.toml
```

This will deploy the audio delivery Worker to:
- Default URL: `https://wavestk-worker.{your-subdomain}.workers.dev`

## Step 2: Deploy Pages (Admin UI + API)

```bash
cd /d/github/wavestk
npx wrangler pages deploy public --project-name=wavestk-pages
```

This will deploy the admin interface to:
- Default URL: `https://wavestk-pages.pages.dev`

## Step 3: Configure Environment Variables

Go to Cloudflare Dashboard:

1. Navigate to **Workers & Pages** → **wavestk-pages** → **Settings** → **Environment variables**
2. Add the following variables for **Production**:

   | Variable | Value | Type |
   |----------|-------|------|
   | `BASIC_AUTH_USER` | `<YOUR_USERNAME>` | Plain text |
   | `BASIC_AUTH_PASS` | `<YOUR_PASSWORD>` | Plain text |

3. Add **Bindings**:

   **R2 Bucket Binding:**
   - Variable name: `R2_BUCKET`
   - R2 bucket: `wavestk-audio`

   **D1 Database Binding:**
   - Variable name: `DB`
   - D1 database: `wavestk-db`

## Step 4: Set Custom Domains (Optional)

### For CDN Worker (wave.be2nd.com)

1. Go to **Workers & Pages** → **wavestk-worker** → **Settings** → **Triggers**
2. Click **Add Custom Domain**
3. Enter: `wave.be2nd.com`
4. Follow DNS setup instructions (Cloudflare will auto-configure if domain is on Cloudflare)

### For Pages Admin (admin-wave.be2nd.com) - Optional

1. Go to **Workers & Pages** → **wavestk-pages** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `admin-wave.be2nd.com`
4. Follow DNS setup instructions

## Step 5: Update URL in Code (if using custom domain)

If you set up `wave.be2nd.com` as the CDN domain, update the following files:

**File: `functions/api/[[path]].ts`**

Change line ~93:
```typescript
const url = `https://wave.be2nd.com/${filename}`;
```

Redeploy Pages:
```bash
npx wrangler pages deploy public --project-name=wavestk-pages
```

## Step 6: Test the Deployment

### Test CDN Worker

```bash
curl -I https://wavestk-worker.{your-subdomain}.workers.dev/healthz
```

Expected: `200 OK`

### Test Pages (with Basic Auth)

```bash
curl -u <username>:<password> https://wavestk-pages.pages.dev/api/health
```

Expected: `{"status":"ok","service":"wavestk-api"}`

### Test Full Upload Flow

1. Open admin UI: `https://wavestk-pages.pages.dev/`
2. Log in with credentials: `mn` / `39`
3. Upload a small audio file (e.g., test.mp3)
4. Verify the audio URL is accessible
5. Check library page to see the uploaded file

## Troubleshooting

### Issue: 401 Unauthorized

- Check environment variables `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` are set correctly in Cloudflare Dashboard
- Clear browser cache and try again

### Issue: R2_BUCKET is not defined

- Verify R2 bucket binding is configured in Pages settings
- Binding name must be exactly `R2_BUCKET`
- Bucket name must be `wavestk-audio`

### Issue: DB is not defined

- Verify D1 database binding is configured in Pages settings
- Binding name must be exactly `DB`
- Database ID must match: `03ec3633-2399-4907-b4e0-763c53395a05`

### Issue: Audio file not found (404)

- Check if the file was actually uploaded to R2 bucket
- Verify Worker is deployed correctly
- Check filename format (must be 8 alphanumeric characters + extension)

## Useful Commands

```bash
# View Worker logs
npx wrangler tail wavestk-worker

# View Pages deployment logs
npx wrangler pages deployment list --project-name=wavestk-pages

# List R2 bucket contents
npx wrangler r2 object list wavestk-audio

# Query D1 database
npx wrangler d1 execute wavestk-db --remote --command="SELECT * FROM audio_files LIMIT 10"

# Delete a file from R2
npx wrangler r2 object delete wavestk-audio/{filename}
```

## Post-Deployment Checklist

- [ ] Worker deployed successfully
- [ ] Pages deployed successfully
- [ ] Environment variables configured
- [ ] R2 bucket binding configured
- [ ] D1 database binding configured
- [ ] Basic authentication working
- [ ] Can upload audio files
- [ ] Can view audio library
- [ ] Can delete audio files
- [ ] Audio files are accessible via CDN URL
- [ ] Custom domain configured (optional)

## Next Steps

1. Test with various audio formats (MP3, M4A, WAV, etc.)
2. Verify Range Request works (seek functionality in audio player)
3. Monitor R2 storage usage
4. Set up Cloudflare Analytics for tracking
5. Consider adding more features (playlists, tags, etc.)

## Cost Monitoring

Track usage in Cloudflare Dashboard:

1. **R2 Storage**: Dashboard → R2 → wavestk-audio → Metrics
2. **Workers Requests**: Dashboard → Workers & Pages → wavestk-worker → Metrics
3. **Pages Requests**: Dashboard → Workers & Pages → wavestk-pages → Metrics
4. **D1 Usage**: Dashboard → D1 → wavestk-db → Metrics

Expected monthly cost: ~$1.51 (100GB storage, 10K requests)
