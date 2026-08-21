# NMC Smart Sanitation Web Dashboard

Production-oriented React, TypeScript, and Vite frontend for the NMC Smart Sanitation Governance System web dashboard. Current scope is limited to the web roles:

- `CCC Operator`
- `Sanitary Inspector`
- `Commissioner`

The mobile app, WhatsApp client, IoT gateway, GPS tracker feed, database, and backend microservices are intentionally out of scope and preserved as future integrations behind typed interfaces.

## Setup

1. `pnpm install`
2. `copy .env.example .env`
3. `pnpm dev`

## Mock Mode

Mock mode is enabled by default:

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=/api
```

The UI always talks through the typed API client. In mock mode, `MSW` provides realistic development responses, including Ward 16 / Allipuram weighbridge data and explicitly blocked or pending integrations where the architecture says they are not live.

To prepare for the future NMC gateway, switch:

```env
VITE_API_MODE=gateway
```

That disables the mock worker without changing feature components.

## Project Structure

- `src/app`: shell, routing, and providers
- `src/core`: auth, RBAC, API layer, config, realtime abstraction, domain types
- `src/features`: dashboard modules
- `src/shared`: reusable UI, tables, and utilities
- `src/mocks`: MSW worker, handlers, and realistic development data

## Commands

- `pnpm dev`: run the dashboard locally
- `pnpm lint`: run Oxlint
- `pnpm test`: run Vitest tests
- `pnpm test:e2e`: run Playwright smoke coverage
- `pnpm build`: create the production build

## Notes

- Commissioner sign-off uses a development-only mock second-step verification flow.
- Pending integrations remain visibly marked as blocked, manual, or not wired instead of being presented as live services.
- Server-state is handled with TanStack Query; Zustand is limited to auth session state.
