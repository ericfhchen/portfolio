# On-Demand Cache Revalidation

This project uses Next.js caching to improve performance when fetching data from Are.na. However, you can force the cache to refresh immediately after updating content on Are.na using the revalidation API.

## Setup

1. **Add the secret to your environment variables:**

Add this to your `.env.local` file:

```bash
REVALIDATE_SECRET=your_random_secret_string_here
```

Generate a secure random string:
```bash
openssl rand -base64 32
```

2. **Deploy/Restart your application** to pick up the new environment variable.

## How to Use

After you update content on Are.na (bio, work, links, etc.), you can force the site to refresh the cache immediately.

### Method 1: Using curl (Terminal/Command Line)

**To refresh the Bio channel:**
```bash
curl -X POST https://your-domain.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your_random_secret_string_here",
    "tag": "arena-channel-your-bio-channel-slug"
  }'
```

**To refresh the Work channel:**
```bash
curl -X POST https://your-domain.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your_random_secret_string_here",
    "tag": "arena-channel-your-work-channel-slug"
  }'
```

**To refresh the Blog channel:**
```bash
curl -X POST https://your-domain.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your_random_secret_string_here",
    "tag": "arena-channel-your-blog-channel-slug"
  }'
```

### Method 2: Using a URL (Browser/GET request)

For easier testing, you can also use a GET request:

```
https://your-domain.com/api/revalidate?secret=YOUR_SECRET&tag=arena-channel-your-bio-channel-slug
```

Just open this URL in your browser (replace `your-domain.com`, `YOUR_SECRET`, and the channel slug with your actual values).

### Method 3: Using JavaScript/Fetch

```javascript
async function revalidateArenaContent(channelSlug) {
  const response = await fetch('https://your-domain.com/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret: 'your_random_secret_string_here',
      tag: `arena-channel-${channelSlug}`
    })
  });
  
  const result = await response.json();
  console.log('Revalidation result:', result);
}

// Usage:
revalidateArenaContent('your-bio-channel-slug');
revalidateArenaContent('your-work-channel-slug');
revalidateArenaContent('your-blog-channel-slug');
```

## Cache Tags

The following cache tags are available:

- `arena-channel-{slug}` - Revalidates a specific Are.na channel by its slug

## Local Development

For local development at `http://localhost:3000`:

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your_secret",
    "tag": "arena-channel-your-bio-channel-slug"
  }'
```

## Response Format

**Success:**
```json
{
  "revalidated": true,
  "tag": "arena-channel-your-bio-channel-slug",
  "now": 1699876543210
}
```

**Error:**
```json
{
  "error": "Invalid secret"
}
```

## Security Notes

- **Never commit your `REVALIDATE_SECRET` to version control**
- Keep your secret secure - anyone with this secret can trigger cache revalidation
- Consider using different secrets for different environments (development, staging, production)
- You can also set up Are.na webhooks to automatically call this endpoint when content changes

## Automation (Optional)

You can create a simple shell script to make revalidation easier:

```bash
#!/bin/bash
# revalidate.sh

SECRET="your_secret_here"
DOMAIN="your-domain.com"

echo "Revalidating Are.na content..."

# Revalidate bio
curl -X POST https://$DOMAIN/api/revalidate \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$SECRET\",\"tag\":\"arena-channel-your-bio-channel-slug\"}"

# Revalidate work
curl -X POST https://$DOMAIN/api/revalidate \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$SECRET\",\"tag\":\"arena-channel-your-work-channel-slug\"}"

echo "\nDone!"
```

Make it executable:
```bash
chmod +x revalidate.sh
```

Run it:
```bash
./revalidate.sh
```

