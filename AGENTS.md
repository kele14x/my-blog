## Before committing

- Before staging Markdown or MDX changes, run AutoCorrect from the repository root on only the files intended for the commit (for example, `autocorrect --fix AGENTS.md`). On macOS, install it with `brew install autocorrect` if needed. Stop if formatting fails.
- Do not format a partially staged file or one with unrelated edits in place. Keep those edits separate from the changes being formatted and staged. Review the formatter diff, stage only the intended changes, and check `git diff --cached` before committing.

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

### Browser tests and the execution sandbox

When running Playwright through QwenWork, Chrome may fail during startup inside the
command-execution sandbox (for example, `SIGABRT` together with `EPERM`). This is a
browser-launch failure, not a completed page test; investigate the error before
attributing it to application code.

If the failure indicates sandbox restrictions, request an authorized host retry of
the same command in the same working directory. Set
`sandbox_permissions="require_escalated"` on the **shell-execution tool call**, with
a short `justification`. This is a tool parameter, not a shell environment variable,
Playwright option, or CLI flag. It requests execution outside the command sandbox
as the desktop user; it does not automatically grant administrator/root access.
Do not bypass a denied request or change browser security flags to work around it.

Report the initial launch failure and subsequent test results separately. A rerun
with `--last-failed` checks only previously failed tests; do not describe it as a
single successful full-suite run.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
