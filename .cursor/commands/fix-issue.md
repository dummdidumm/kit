# fix-issue

Analyze the given issue.

You are an expert at fixing SvelteKit issues.

Your goal is to fix the bug of the linked issue.

## Instructions:

1. Read the issue carefully to understand the bug.
2. If the issue references a Stackblitz or Github link as a reproduction and the problem is not immediately obvious from the description, use the download.js script (in playgrounds/download.js) to download the reproduction as a playground (example: `node playgrounds/download.js "https://stackblitz.com/edit/sveltejs-kit-template-default-n1wzmkzd" a-fitting-playground-name`).
3. cd into the created playground. The download script rewrites `package.json` to use `workspace:*` (for `@sveltejs/*` packages) and `catalog:` (for `svelte`, `vite`, etc.), so those should already be correct. Check for any packages the script might not know about (e.g. a custom adapter or unusual dependency). If something looks wrong, abort.
4. Run `pnpm install` **from the repo root** (not the playground directory) — this is a pnpm workspace so dependencies resolve from the root.
5. Make sure the playground's `vite.config.js` has `server: { fs: { allow: ['../../packages/kit'] } }` — this is needed so Vite can access the local kit source. If it's missing, add it.
6. Run `pnpm dev` in the created playground to start a dev server (located at http://localhost:5173).
7. Open the browser at http://localhost:5173 and debug the issue. Do bugfixes inside `packages/kit/src/`.
8. Once debugged and fixed, write a test inside `packages/kit/test/apps/basics/` (Playwright integration tests).
9. Once done, think about whether you fixed the issue for real or just fixed the symptom. If for real, explain in detail why. If not, explain why you thought this is right and why it turned out to be wrong, then continue with fixing for real.

### Key patterns for writing tests:

If playwright is missing install with `pnpm playwright install chromium`.

**Test infrastructure overview:**

- Integration tests use Playwright and live in `packages/kit/test/apps/basics/test/`
- There are three main test files:
  - `test.js` — general tests (run with both JS enabled and disabled)
  - `client.test.js` — client-only tests (skipped when JS is disabled)
  - `server.test.js` — server-only tests (skipped when JS is enabled)
- Unit tests use Vitest and live next to source files as `*.spec.js`
- Tests run against both dev mode (`DEV=true`) and production build (`pnpm build && pnpm preview`)
- DO NOT RUN TESTS IN YOUR SANDBOX, CHROMIUM IS NOT INSTALLED THERE, RUN THEM IN USER CWD

**Which test file to add your test to:**

- `test.js` — for bugs that should be verified both with and without JavaScript (most bugs)
- `client.test.js` — for client-only bugs (navigation, hydration, client-side state). These are auto-skipped when `javaScriptEnabled` is false.
- `server.test.js` — for server-only bugs (SSR output, headers, server load). These are auto-skipped when `javaScriptEnabled` is true.
- Add your test inside an existing `test.describe` block if one fits, or create a new describe block.

**Other test apps:** Besides `basics`, there are specialized test apps in `packages/kit/test/apps/` — `options` (config variations), `no-ssr`, `hash-based-routing`, `dev-only`, `async`, etc. Use these if the bug relates to a specific config. Most bugs go in `basics`. **Remote function tests go in `packages/kit/test/apps/async/`** (this app has `experimental.remoteFunctions: true` in its `svelte.config.js`).

**Creating a test route:**

- Add route files to `packages/kit/test/apps/basics/src/routes/<your-feature>/`
- Use standard SvelteKit route conventions (`+page.svelte`, `+page.js`, `+page.server.js`, `+layout.svelte`, etc.)
- Keep the route minimal — only what's needed to reproduce the bug

**Writing the test:**

```js
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test.describe('Feature Name', () => {
	test('description of expected behavior', async ({ page, clicknav, app, javaScriptEnabled }) => {
		await page.goto('/your-route');
		expect(await page.textContent('h1')).toBe('Expected');
	});
});
```

**Available custom fixtures** (from `packages/kit/test/utils.js`):

- `app.goto(url)` — programmatic client-side navigation (calls SvelteKit's `goto`)
- `app.invalidate(url)` — trigger load function re-runs
- `app.preloadData(url)` / `app.preloadCode(url)` — preload routes
- `clicknav(selector)` — click a link and wait for navigation (works with and without JS)
- `javaScriptEnabled` — boolean to branch logic for JS/no-JS scenarios
- `start_server(handler)` — spin up a local HTTP server for mocking external APIs
- `read_errors(path)` — read errors logged to `test/errors.json`

**How the test fixtures work:**

- The root layout (`+layout.svelte`) calls `setup()` from `packages/kit/test/setup.js`
- `setup()` exposes `goto`, `invalidate`, `preloadCode`, `preloadData`, `beforeNavigate`, `afterNavigate` on `window` so Playwright can call them via `page.evaluate`
- It also adds `body.started` class so the test harness knows hydration is complete

**Common assertion patterns:**

```js
// Text content
expect(await page.textContent('h1')).toBe('value');

// JSON in a <pre> tag
const json = JSON.parse((await page.textContent('pre')) ?? '');
expect(json).toEqual({ key: 'value' });

// Response status/headers (use request fixture)
const response = await request.get('/endpoint');
expect(response.status()).toBe(200);

// Navigation with link click
await clicknav('[href="/target"]');
expect(await page.textContent('h1')).toBe('Target');

// Client-side only behavior
if (javaScriptEnabled) {
	await app.goto('/other');
	expect(await page.textContent('h1')).toBe('Other');
}

// Track network requests
const requests = [];
page.on('request', (r) => requests.push(r.url()));
await page.goto('/route');
expect(requests.some((r) => r.includes('data.json'))).toBe(true);
```

**Skipping tests conditionally:**

```js
// Skip for no-JS (client-only test)
test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

// Skip on webkit
test.skip(() => process.env.KIT_E2E_BROWSER === 'webkit');
```

**Running a specific test:**

```bash
# Single test file in dev mode
cd packages/kit/test/apps/basics && npx playwright test --grep "test name"

# Full suite
pnpm -F test-basics test:dev
```

### Key pointers for fixing bugs:

**Source code layout (`packages/kit/src/`):**

- `src/runtime/` — client and server runtime (where most bugs live)
  - `runtime/client/client.js` (~3200 lines) — the client-side router, navigation, load function orchestration, history/scroll management. **This is the most common bug location.**
  - `runtime/client/fetcher.js` — client-side fetch wrapper with caching
  - `runtime/client/remote-functions/` — client-side remote function stubs (see remote functions section below)
  - `runtime/server/respond.js` — main server request handler
  - `runtime/server/remote.js` — server-side remote function request handler
  - `runtime/server/page/render.js` — SSR HTML rendering
  - `runtime/server/page/load_data.js` — server-side load function execution
  - `runtime/server/page/actions.js` — form action handling
  - `runtime/app/forms.js` — client-side `use:enhance` and `applyAction`
  - `runtime/app/navigation.js` — `goto`, `invalidate`, and other navigation APIs
  - `runtime/app/stores.js` — `$app/stores` (`page`, `navigating`, `updated`)
  - `runtime/app/server/remote/` — server-side remote function definitions (`query`, `form`, `command`, `prerender`)
- `src/exports/` — Vite plugin and public API
  - `exports/vite/index.js` — the SvelteKit Vite plugin (config, virtual modules, dev server)
  - `exports/index.js` — public API (`error()`, `redirect()`, `json()`, `fail()`, etc.)
- `src/core/` — build-time code generation
  - `core/sync/` — file system scanning, route manifest, type generation
  - `core/postbuild/` — prerendering and route analysis
- `src/utils/` — shared utilities (routing, URL handling, error handling)

**Common bug categories and where to look:**

- **Navigation/routing bugs** → `runtime/client/client.js` (look at `navigate()`, `get_navigation_intent()`, `load_route()`)
- **Load function bugs** → `runtime/client/client.js` (`load_node()`, `has_changed()`) and `runtime/server/page/load_data.js`
- **Form action bugs** → `runtime/server/page/actions.js` and `runtime/app/forms.js`
- **SSR/hydration bugs** → `runtime/server/page/render.js`
- **Build/config bugs** → `exports/vite/index.js`
- **Route matching bugs** → `utils/routing.js`
- **Cookie bugs** → `runtime/server/cookie.js`
- **Redirect bugs** → `exports/index.js` (the `redirect()` function) and `runtime/server/respond.js`
- **Remote function bugs** → see the dedicated section below

**Debugging tips:**

- For client-side bugs, add `console.log` statements in `runtime/client/client.js` — they will appear in the browser console. Use the playground's dev server to test interactively.
- For server-side bugs, add `console.log` in `runtime/server/` files — they will appear in the terminal running the dev server.
- The `__data.json` endpoint is how the client fetches server load data during client-side navigation — if data loading behaves differently between SSR and client nav, look at `runtime/server/data/index.js`.
- For reactivity bugs that go deeper, it may be that Svelte itself has a bug (not SvelteKit). In that case try to minimize the reproduction as much as possible, then end without a fix in SvelteKit but with an explanation what you think is wrong in Svelte.

**After fixing:**

- Run unit tests: `pnpm -F @sveltejs/kit test:unit`
- Run the specific integration test: add `.solo` to the test then run `cd packages/kit/test/apps/basics && pnpm test`
- Add a changeset: `pnpm changeset` from the root, patch release for affected packages, message is of the form "fix: -short description, ten words maximum-"

## Feedback

Once you are done with the task, give feedback on what would have helped you fix this bug faster, and what insights about the system you gained.
