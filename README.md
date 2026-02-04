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
ARENA_BLOG_CHANNEL=site.blog
SITE_TITLE=Eric Chen
SITE_DOMAIN=ericlchen.com
SITE_BLOG_DOMAIN=blog.ericlchen.com
```

`SITE_BLOG_DOMAIN` is optional—omit it if your blog lives at the default `blog.{SITE_DOMAIN}`.

### Deployment
Deploy on Vercel and configure the same environment variables. The app uses the Next.js App Router with incremental revalidation so no additional cache setup is required.

Steps to expose the blog on `blog.ericlchen.com`:

1. Add `ARENA_BLOG_CHANNEL` (and optionally `SITE_BLOG_DOMAIN`) to your Vercel environment variables and redeploy.
2. In the Vercel dashboard, attach the `blog.ericlchen.com` domain to this project so the rewrites can match the subdomain.
3. Create a CNAME record for `blog` in your DNS provider pointing to the Vercel target (`cname.vercel-dns.com`).
4. Once DNS propagates, visiting `blog.ericlchen.com` will render the `/blog` route from this deployment.
