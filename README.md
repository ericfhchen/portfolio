## Eric Chen — Portfolio

Production-ready Next.js application that powers the landing and about pages for Eric Chen, sourcing public and private content from Are.na.

### Requirements
- Node.js 20+
- pnpm 9+

### Setup
```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Populate `.env.local` with an Are.na access token and channel slugs:
```
ARENA_TOKEN=xxxxxxxxxxxxxxxx
ARENA_BIO_CHANNEL=site.bio
ARENA_WORK_CHANNEL=site.work
SITE_TITLE=Eric Chen
SITE_DOMAIN=ericlchen.com
```

### Deployment
Deploy on Vercel and configure the same environment variables. The app uses the Next.js App Router with incremental revalidation so no additional cache setup is required.
