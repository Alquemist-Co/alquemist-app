Set up the Alquemist development environment from scratch on this machine.

## Steps

1. **Check prerequisites** — verify Node.js >= 20, pnpm, and Docker are installed and running. If any are missing, tell me exactly what to install and stop.

2. **Run the setup script** — execute `pnpm dev:setup` which handles:
   - Installing dependencies (`pnpm install --frozen-lockfile`)
   - Starting local Supabase (Docker containers, migrations, seed)
   - Auto-generating `.env.local` with the correct local Supabase keys
   - Generating TypeScript types from the database
   - Running health checks

3. **Verify everything works** — run `pnpm build` to confirm the app compiles without errors.

4. **Report results** — show me:
   - Supabase Studio URL
   - Test user credentials (from seed)
   - Any warnings or issues found
   - Next steps (`pnpm dev` to start developing)

If `pnpm dev:setup` fails at any step, diagnose the issue and fix it before continuing. Common issues:
- Docker not running → try `sudo service docker start` (WSL2) or tell me to start Docker Desktop
- Port conflicts → check what's using the port and suggest resolution
- Missing RESEND_API_KEY → this is fine for local dev, just note that email features won't work
