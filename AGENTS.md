## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Testing

Two runners, kept separate so they never claim each other's files:

```
npm test          # unit tests, node --test, tests/*.test.ts
npm run test:e2e  # browser tests, Playwright, tests/e2e/
```

Put new unit tests in `tests/` and browser tests in `tests/e2e/`. Playwright reuses the
locally installed Google Chrome (`channel: 'chrome'`) and builds + previews the site
itself on port 4399, so no server needs to be started by hand. `npm run test:e2e:ui`
opens the interactive UI mode; failures keep a trace at `test-results/`, viewable with
`npx playwright show-trace <path/to/trace.zip>`.

Astro binds to `::1` by default. Pass `--host 127.0.0.1` when starting a server that a
browser must reach over IPv4, otherwise `localhost` connections fail.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
