# EAG - Easy Alias Generator

> Previously known as `bitwarden-alias-provider`. The old version is available in tags below `3.0.0`.

EAG creates and manages forwarding email aliases on **Purelymail** and **MXRoute**. It has a self-hosted web app and API. The API talks to the email providers: browsers cannot call their APIs directly because of CORS. The same API supports Bitwarden's Addy.io-compatible forwarded-email generator.

## Run EAG

1. Copy `.env.example` to `.env` and set a long random `SERVER_API_TOKEN`.
2. For standalone API use, Bitwarden integration, or server-default provider settings, also configure `ALIAS_PROVIDER` and its provider credentials in `.env`.
3. For the web UI, start both services using `docker compose -f docker-compose.example.yml up -d` (or `bun run api` and `bun run dev` in separate terminals). For Bitwarden without the web UI, run only `bun run api`.
4. Visit `http://localhost:6124`, enter the server token, domain and forwarding destination, and manage aliases. The default server URL `/api` goes through the web server to EAG's API. The API itself listens on `http://localhost:6123`.

The web UI can also choose a provider and enter its credentials instead of using the server's environment defaults. The browser sends them to **your** authenticated API, which calls the provider; it does not call Purelymail or MXRoute directly. Connection settings, including the server API token and provider keys, are saved in browser local storage and restored after reload. They are not encrypted and are readable by anyone with access to that browser profile or scripts running on the web app's origin. Use **Forget saved connection** in the UI to remove them, and use HTTPS if accessing EAG across a network.

To run the API alone, set `SERVER_API_TOKEN`, `ALIAS_PROVIDER`, and provider credentials. It serves authenticated `POST /add/<path>`, `GET /list/<domain>`, and `DELETE /delete/<email>`. Bitwarden and other standalone clients use the environment-configured provider; provider settings from the web UI are **not** stored on the server. `SERVER_API_TOKEN` must be configured on the server even if provider credentials are supplied through the UI. Do not publish `.env`.

For a web UI hosted separately from the API, enter its full server URL in the UI and set `EAG_ALLOWED_ORIGINS` on the API to that web origin. The bundled web server proxies `/api` to the API using `SERVER_ADDRESS` (default `http://eag-api:6123` in Docker); Vite proxies `/api` to `http://localhost:6123` by default.

## Bitwarden integration

**The web UI is not required for Bitwarden integration.** Run only the API with `SERVER_API_TOKEN`, `ALIAS_PROVIDER`, and the chosen provider's credentials configured through environment variables. Bitwarden must be able to reach that API; provider settings entered only in the web UI are not available to Bitwarden.

In Bitwarden select **Generator → Username → Forwarded email alias → Addy.io** and configure:

| Setting              | Value                                            |
| -------------------- | ------------------------------------------------ |
| Email domain         | `domain=example.com,destination=you@example.com` |
| API Key              | The value of `SERVER_API_TOKEN`                  |
| Self-host server URL | `https://your-eag-api.example/add`               |

Replace the example domain and destination with yours. Configure options in **Email domain** using comma-separated `key=value` pairs.

### Available options

| Option            | Type   | Required | Default  | Description                                               |
| ----------------- | ------ | -------- | -------- | --------------------------------------------------------- |
| `domain`          | String | yes      | None     | The domain to create the alias on.                        |
| `destination`     | String | yes      | None     | The destination email address.                            |
| `template`        | String | no       | `<slug>` | Format template. Allowed placeholders: `<slug>`, `<hex>`. |
| `prefix`          | String | no       | None     | Prefix added to the alias.                                |
| `suffix`          | String | no       | None     | Suffix added to the alias.                                |
| `hex_length`      | Number | no       | 6        | Length of the random hex string.                          |
| `slug_length`     | Number | no       | 2        | Number of words in the slug.                              |
| `slug_separator`  | String | no       | `_`      | Separator between slug words.                             |
| `alias_separator` | String | no       | `_`      | Separator between alias components.                       |
| `static`          | String | no       | None     | Use this exact alias name instead of generating one.      |

Generated slugs select words from the [2,048-word English BIP-39 list](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt) and include a cryptographically random hexadecimal suffix. When `static` is set, generation options such as `template`, `prefix`, and `suffix` are ignored.

If you prefer not to write the options string by hand, the optional web UI has an **Alias generation options** section with a **Bitwarden Email domain field** you can copy. This is just a configuration helper; Bitwarden talks directly to the EAG API.

## Development

- `apps/api`: Bun HTTP API, with environment defaults and authenticated session provider overrides.
- `apps/web`: React + Mantine web app, served by Nginx or Vite.
- `packages/core`: alias generation and Bitwarden options parsing.
- `packages/providers`: shared `Provider` interface and MXRoute/Purelymail adapters. User-supplied provider loading is in WIP.
