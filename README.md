# wavestk

Universal Audio CDN on Cloudflare

## Overview

wavestk is a simple, fast, and stable audio CDN built on Cloudflare infrastructure (Workers, Pages, R2, D1). Perfect for embedding audio files in blogs and websites using simple URL syntax.

## Features

- Simple URL embedding: `![audio](https://wave.masa86.com/abc123de.mp3)`
- Web-based upload interface
- HTTP Range Request support (seekable audio playback)
- Audio library with search, preview, and delete functions
- Basic authentication for security
- Supported formats: MP3, M4A, AAC, WAV, OGG, Opus, FLAC, WebM
- File size limit: 100MB
- Cost: ~$1.51/month (100GB storage, 10K requests)

## Architecture

```
wavestk/
├── worker/          # CDN delivery Worker (wave.masa86.com)
├── redirect-worker/ # Redirect Worker (wave.be2nd.com → wave.masa86.com)
├── functions/       # Pages Functions API (Hono)
├── public/          # Admin UI (static HTML + JS)
├── db/              # D1 database schema
└── docs/            # Documentation
```

## Tech Stack

- **CDN**: Cloudflare Workers
- **Admin UI**: Cloudflare Pages (Vanilla JS + Tailwind CSS)
- **API**: Cloudflare Pages Functions + Hono
- **Storage**: Cloudflare R2
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: HTTP Basic Authentication

## Setup

### Prerequisites

- Cloudflare account
- Node.js 18+ and npm
- Wrangler CLI

### Installation

```bash
# Install dependencies
npm install

# Create R2 bucket
npm run r2:create

# Create D1 database
npm run db:create
# Copy the database_id from output and update wrangler.toml files

# Run database migration
npm run db:migrate
```

### Development

```bash
# Local development (Worker)
npm run dev:worker

# Local development (Pages)
npm run dev:pages
```

### Deployment

```bash
# Deploy Worker
npm run deploy:worker

# Deploy Pages
npm run deploy:pages

# Set environment variables in Cloudflare Dashboard
# - BASIC_AUTH_USER: <YOUR_USERNAME>
# - BASIC_AUTH_PASS: <YOUR_PASSWORD>
# - R2_BUCKET: wavestk-audio (binding)
# - DB: wavestk-db (binding)
```

### Custom Domain Setup

1. Worker (CDN delivery)
   - Set custom domain: `wave.masa86.com`
   - Set environment variable: `CDN_DOMAIN=https://wave.masa86.com`

2. Pages (Admin UI) - Optional
   - Set custom domain: `admin-wave.masa86.com`

3. Redirect Worker (for migration) - Optional
   - Deploy redirect-worker to `wave.be2nd.com`
   - Automatically redirects old URLs to new domain

## Usage

### Upload Audio

1. Access admin page: `https://admin-wave.masa86.com/` (or Workers URL)
2. Log in with Basic Auth credentials
3. Drag & drop audio files or click to select
4. Click "Upload" button
5. Copy the generated URL or Markdown code

### Embed in Blog

```markdown
![audio](https://wave.masa86.com/abc123de.mp3)
```

Or use HTML `<audio>` tag:

```html
<audio controls src="https://wave.masa86.com/abc123de.mp3"></audio>
```

### Manage Audio Library

1. Access library page: `https://admin-wave.masa86.com/library.html`
2. Search by filename
3. Preview audio with built-in player
4. Copy URL or Markdown code
5. Delete unwanted files

## API Reference

### Upload

```
POST /api/upload
Content-Type: application/json

{
  "files": [
    {
      "name": "sample.mp3",
      "data": "data:audio/mpeg;base64,/+MYx...",
      "size": 5242880,
      "type": "audio/mpeg"
    }
  ]
}
```

### List

```
GET /api/audio?search={keyword}&limit=50&offset=0
```

### Delete

```
DELETE /api/audio/{id}
```

### CDN Delivery

```
GET /{filename}

Example: GET /abc123de.mp3
Response: 200 OK (or 206 Partial Content for Range Request)
```

## Cost Estimate

| Item | Usage (monthly) | Cost |
|------|----------------|------|
| R2 Storage (100GB) | 100GB | $1.50 |
| R2 Class A (PUT) | 1,000 | $0.004 |
| R2 Class B (GET) | 10,000 | $0.004 |
| Workers Requests | 100,000 | Free |
| D1 Reads | 50,000 | Free |
| D1 Writes | 1,000 | Free |
| **Total** | - | **~$1.51/month** |

## Documentation

- [Requirements](docs/requirements.md) - Detailed requirements specification
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Hono](https://hono.dev/)

## License

MIT

## Author

masa162
