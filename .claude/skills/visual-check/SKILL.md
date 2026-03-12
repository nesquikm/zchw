---
name: visual-check
description: Visually verify the web dashboard using a rubber duck with Chrome browser tools. Use after building or modifying web UI components to confirm they render correctly.
user-invocable: true
argument-hint: '[page-path] [checklist items...]'
---

# Visual Check

Visually verify the web dashboard by using a rubber duck (MCP) with Chrome browser tools.

## Process

### 1. Ensure the dev server is running

Check if http://localhost:5173 is reachable:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

- If it returns `200`, proceed.
- If not, start the server: `npm run dev:web` (run in background), wait a few seconds, then re-check.

### 2. Ask a duck to verify the page

Use `ask_duck` to have a duck open the page in Chrome and verify it visually. The duck should NOT run shell commands — it should only use its Chrome/browser MCP tools.

The default page is `/dashboard` unless `$ARGUMENTS` specifies a different path.

#### Base verification (always check)

Ask the duck to open `http://localhost:5173/<page-path>` and report:

- Does the page render without errors?
- Is the layout correct (no broken styles, overlapping elements, missing content)?
- Are all expected UI elements visible?

#### Filter switching (for dashboard pages)

After verifying the base page, ask the duck to check filter switching by navigating to URLs with different query params:

- **Date range**: `?range=7d`, `?range=30d`, `?range=90d`
  - Do metric values change between ranges?
  - Does the period label update?
- **Team filter**: `?range=30d&teams=team-platform`
  - Do values change to reflect filtered data?
- **Model filter**: `?range=30d&models=claude-sonnet-4`
  - Do values change?
- **Combined**: `?range=7d&teams=team-mobile&models=gpt-4o`
  - Does everything still render? No errors?

For each URL, report the key metric values so changes can be compared.

#### Custom checklist

If `$ARGUMENTS` includes specific items to check (beyond the page path), ask the duck to verify those as well.

### 3. Report results

Summarize findings as a pass/fail checklist:

- ✓ Page renders correctly
- ✓ Layout and styling look good
- ✓ Filter switching works (values change, period updates)
- ✗ [Any issues found]

### 4. Clean up

After verification, kill the dev server if you started it:

```bash
lsof -ti:5173 | xargs kill 2>/dev/null
```

## Notes

- The duck uses Chrome browser MCP tools — it should NOT run shell commands
- If a duck can't reach localhost, try a different duck provider
- For SPA pages, the duck needs to navigate to the full URL with path and query params — WebFetch won't work since the app is client-rendered
