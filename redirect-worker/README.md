# Redirect Worker (wave.be2nd.com → wave.masa86.com)

## Purpose

This worker provides permanent (301) HTTP redirects from the old domain `wave.be2nd.com` to the new domain `wave.masa86.com`.

## Deployment

```bash
cd redirect-worker
npx wrangler deploy
```

## Custom Domain Setup

1. Go to Cloudflare Dashboard
2. Navigate to **Workers & Pages** → **wavestk-redirect**
3. Go to **Settings** → **Triggers**
4. Click **Add Custom Domain**
5. Enter: `wave.be2nd.com`
6. Confirm DNS configuration

## How It Works

The worker redirects all requests from `wave.be2nd.com` to `wave.masa86.com` while preserving:
- URL paths
- Query strings
- All request parameters

### Examples

```
https://wave.be2nd.com/jfgpumc7.m4a
  → 301 Redirect to →
https://wave.masa86.com/jfgpumc7.m4a
```

```
https://wave.be2nd.com/abc123.mp3?v=1
  → 301 Redirect to →
https://wave.masa86.com/abc123.mp3?v=1
```

## Duration

Keep this redirect active for at least **6-12 months** to ensure:
- Search engine indexes are updated
- Bookmarks are preserved
- Embedded links in blog posts continue to work

## Cost

- **Free** under Cloudflare Workers free tier (100,000 requests/day)
- No additional storage or compute costs

## Removal

After the migration period (6-12 months), you can:
1. Remove the custom domain `wave.be2nd.com` from this worker
2. Delete the `wavestk-redirect` worker
3. Let the `be2nd.com` domain expire if no longer needed
