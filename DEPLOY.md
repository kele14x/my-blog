# Deploy Guide: GitHub + Cloudflare Pages + Custom Domain

This is an Astro blog. Source lives on GitHub; Cloudflare Pages builds and hosts it; your domain (DNS already on Cloudflare) binds automatically.

## 0. Before deploying: set your domain

Edit `astro.config.mjs` and replace `https://example.com` with your real domain, e.g.:

```js
site: 'https://yourdomain.com',
```

Also customize `src/consts.ts` (site title/description) and the About page at `src/pages/about.astro`.

## 1. Push to GitHub

Create an empty repo on GitHub (e.g. `my-blog`), then in this folder:

```bash
git init
git add .
git commit -m "Initial blog"
git branch -M main
git remote add origin https://github.com/<your-username>/my-blog.git
git push -u origin main
```

## 2. Create the Cloudflare Pages project

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize GitHub and select the `my-blog` repo.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Node version is pinned to 24 via the `.node-version` file (Astro 7 requires Node >= 22).
4. **Save and Deploy.** First build takes a few minutes.
5. Verify the site at `https://my-blog-xxx.pages.dev`.

Every `git push` to `main` now auto-deploys. Other branches get preview URLs.

## 3. Bind your custom domain (DNS already on Cloudflare)

1. Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `yourdomain.com` → confirm. Cloudflare auto-creates the DNS record and issues the SSL cert (usually active in minutes).
3. Add `www.yourdomain.com` the same way, then redirect www → apex using a **Cloudflare Redirect Rule** (see [Redirecting www → apex](#redirecting-www--apex) below).
4. Domain zone → **SSL/TLS**: mode **Full (strict)**, enable **Always Use HTTPS**.

### Redirecting www → apex

Do **not** use a `public/_redirects` file for this. Pages `_redirects` does not support domain-level redirects — a rule like `https://www.yourdomain.com/* https://yourdomain.com/:splat 301` silently never fires, and `www` serves the site directly (HTTP 200) instead of redirecting. Use a Redirect Rule instead.

**Dashboard:** zone → **Rules** → **Redirect Rules** → **Create rule**:

- **If incoming requests match** → Custom filter expression: `(lower(http.host) eq "www.yourdomain.com")`
- **Then** → Type: *Dynamic*, Expression: `concat("https://yourdomain.com", http.request.uri.path)`
- **Status code:** 301, **Preserve query string:** enabled

**API** (zone-level `http_request_dynamic_redirect` phase; create the ruleset only if one does not exist yet, otherwise `PUT` the rules onto the existing ruleset):

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --data '{
    "name": "Redirect rules ruleset",
    "kind": "zone",
    "phase": "http_request_dynamic_redirect",
    "rules": [{
      "ref": "redirect_www_to_apex",
      "expression": "(lower(http.host) eq \"www.yourdomain.com\")",
      "description": "Redirect www to apex (301)",
      "action": "redirect",
      "enabled": true,
      "action_parameters": {
        "from_value": {
          "target_url": { "expression": "concat(\"https://yourdomain.com\", http.request.uri.path)" },
          "status_code": 301,
          "preserve_query_string": true
        }
      }
    }]
  }'
```

Requires Zone · **Single Redirect** · Edit. Redirect Rules only apply to proxied (orange cloud) hostnames.

Verify: `curl -I https://www.yourdomain.com/blog/` should return `301` with `location: https://yourdomain.com/blog/`.

### Note: custom domains created via API need manual DNS

The dashboard auto-creates the DNS record when you add a custom domain. The API does **not** — the domain stays `pending` with `verification_data.error_message: "CNAME record not set"`. Create proxied CNAMEs yourself:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --data '{"type":"CNAME","name":"yourdomain.com","content":"<project>.pages.dev","proxied":true,"ttl":1}'
```

Repeat for `www.yourdomain.com`. The apex CNAME works because Cloudflare flattens CNAMEs at the zone root on all plans. Verification flips to `active` within about a minute, then the cert issues.

## 4. Write posts

Posts are Markdown/MDX files in `src/content/blog/`. Create a new file, e.g. `src/content/blog/hello-world.md`:

```markdown
---
title: 'Hello World'
description: 'My first post'
pubDate: 'Nov 18 2026'
---

Write your post here.
```

Then `git add`, `commit`, `push` — Cloudflare rebuilds and publishes automatically.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into dist/
```

## Troubleshooting

- **Build fails on Cloudflare:** check the Node version (needs >= 22; `.node-version` handles this) and that output dir is `dist`.
- **Custom domain stuck Pending:** confirm the CNAME record exists in DNS and the proxy (orange cloud) is on; wait a few minutes for the cert.
- **Wrong canonical/RSS links:** you forgot to update `site` in `astro.config.mjs`.