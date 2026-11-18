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
3. Optionally add `www.yourdomain.com` too, then redirect www → apex. Easiest: add a `public/_redirects` file (it gets copied into `dist`):

   ```
   https://www.yourdomain.com/* https://yourdomain.com/:splat 301
   ```

4. Domain zone → **SSL/TLS**: mode **Full (strict)**, enable **Always Use HTTPS**.

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