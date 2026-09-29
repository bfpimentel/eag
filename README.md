# EAG — Easy Alias Generator

EAG creates and manages forwarding email aliases on **Purelymail** and **MXRoute**. It has a self-hosted web app and API. The API talks to the email providers: browsers cannot call their APIs directly because of CORS. The same API supports Bitwarden's Addy.io-compatible forwarded-email generator.

## Run EAG

1. Copy `.env.example` to `.env` and set a long random `SERVER_API_TOKEN`.
2. For standalone API use, Bitwarden integration, or server-default provider settings, also configure `ALIAS_PROVIDER` and its provider credentials in `.env`.
3. Start both services using `docker compose -f docker-compose.example.yml up -d` (or `bun install`, `bun run api`, and `bun run dev` in separate terminals).
4. Visit `http://localhost:6124`, enter the server token, domain and forwarding destination, and manage aliases. The default server URL `/api` goes through the web server to EAG's API. The API itself listens on `http://localhost:6123`.

The web UI can also choose a provider and enter its credentials for the **current session** instead of using the server's environment defaults. The browser sends them to **your** authenticated API, which calls the provider; it does not call Purelymail or MXRoute directly. The token and provider credentials stay in browser memory and are cleared on reload. Domain, destination, and generation options are saved in browser local storage. Use HTTPS if accessing EAG across a network.

To run the API alone, set `SERVER_API_TOKEN`, `ALIAS_PROVIDER`, and provider credentials. It serves authenticated `POST /add/<path>`, `GET /list/<domain>`, and `DELETE /delete/<email>`. Bitwarden and other standalone clients use the environment-configured provider; session-only settings from the web UI are **not** stored on the server. `SERVER_API_TOKEN` must be configured on the server even if provider credentials are supplied through the UI. Do not publish `.env`.

For a web UI hosted separately from the API, enter its full server URL in the UI and set `EAG_ALLOWED_ORIGINS` on the API to that web origin. The bundled web server proxies `/api` to the API using `SERVER_ADDRESS` (default `http://eag-api:6123` in Docker); Vite proxies `/api` to `http://localhost:6123` by default. GitHub Pages deployment is no longer supported. The browser extension artifact also needs a full server URL rather than `/api`; if your API checks request origins, allow that extension's origin with `EAG_ALLOWED_ORIGINS`.

## Bitwarden integration

Open **Bitwarden integration** in the web UI to produce the Addy.io options string. In Bitwarden select **Generator → Username → Forwarded email alias → Addy.io**. Paste the string into **Email domain**, set **API Key** to `SERVER_API_TOKEN`, and set **Self-host server URL** to `https://your-eag-api.example/add`. Bitwarden must be able to reach the API and requires a provider configured on the server via environment variables.

Supported options are `domain`, `destination`, `template` (`<slug>` and/or `<hex>`), `prefix`, `suffix`, `slug_length`, `hex_length`, `slug_separator`, `alias_separator`, and `static`. Generated slugs include a random hexadecimal suffix; their names differ from the old Python `coolname` generator.

## Development

- `apps/api`: Bun HTTP API, with environment defaults and authenticated session provider overrides.
- `apps/web`: React + Mantine web app, served by Nginx or Vite.
- `packages/core`: alias generation and Bitwarden options parsing.
- `packages/providers`: shared `Provider` interface and MXRoute/Purelymail adapters. User-supplied provider loading is out of scope.

Run `bun run check` from the repository root to lint, check formatting, test, and build. Run `bun run format` to format using Oxfmt (88-column target, semicolons, double quotes). Existing Python server deployments can migrate their provider environment variables and Bitwarden settings to `apps/api`; verify alias naming before retiring them.
