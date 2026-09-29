import { generateAlias, parseOptions } from "@eag/core";
import {
  createProvider,
  type Credentials,
  type Provider,
  type ProviderId,
} from "@eag/providers";

export type ApiConfig = {
  token: string;
  providerId?: string;
  credentials?: Credentials;
  allowedOrigins?: string[];
};

const providerIds: ProviderId[] = ["mxroute", "purelymail"];

function resolveProvider(request: Request, config: ApiConfig): Provider {
  const header = request.headers.get("X-EAG-Provider-Config");
  if (header) {
    const value: unknown = JSON.parse(header);
    if (!value || typeof value !== "object") {
      throw new Error("Invalid provider configuration.");
    }

    const { provider, credentials } = value as {
      provider?: unknown;
      credentials?: Record<string, unknown>;
    };
    if (
      !providerIds.includes(provider as ProviderId) ||
      !credentials ||
      typeof credentials.apiKey !== "string" ||
      (credentials.server !== undefined && typeof credentials.server !== "string") ||
      (credentials.username !== undefined && typeof credentials.username !== "string")
    ) {
      throw new Error("Invalid provider configuration.");
    }

    return createProvider(provider as ProviderId, credentials as Credentials);
  }

  if (!providerIds.includes(config.providerId as ProviderId)) {
    throw new Error(
      "Configure a provider in the web UI or set ALIAS_PROVIDER on the server.",
    );
  }

  return createProvider(
    config.providerId as ProviderId,
    config.credentials ?? { apiKey: "" },
  );
}

export function createHandler(config: ApiConfig) {
  if (!config.token) throw new Error("SERVER_API_TOKEN is required.");

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed =
      !origin ||
      origin === url.origin ||
      (config.allowedOrigins ?? []).includes(origin);
    const cors =
      origin && allowed
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Authorization, Content-Type, X-EAG-Provider-Config",
            Vary: "Origin",
          }
        : {};
    const send = (data: unknown, status = 200) =>
      Response.json(data, { status, headers: cors });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }
    if (!allowed) return send({ error: "Origin not allowed." }, 403);
    if (request.headers.get("Authorization") !== `Bearer ${config.token}`) {
      return send({ error: "Unauthorized." }, 401);
    }

    try {
      if (url.pathname === "/" && request.method === "GET") {
        return new Response("EAG API is running.", { headers: cors });
      }

      if (url.pathname.startsWith("/add/") && request.method === "POST") {
        const body: unknown = await request.json();
        if (
          !body ||
          typeof body !== "object" ||
          typeof (body as { domain?: unknown }).domain !== "string"
        ) {
          return send({ error: "Missing domain options." }, 400);
        }

        const options = parseOptions((body as { domain: string }).domain);
        const alias = generateAlias(options);
        const result = await resolveProvider(request, config).create(
          options.domain,
          options.destination,
          alias,
        );
        return send({ data: { email: result.email } });
      }

      if (url.pathname.startsWith("/list/") && request.method === "GET") {
        const domain = decodeURIComponent(url.pathname.slice(6));
        return send(await resolveProvider(request, config).list(domain));
      }

      if (url.pathname.startsWith("/delete/") && request.method === "DELETE") {
        const email = decodeURIComponent(url.pathname.slice(8));
        await resolveProvider(request, config).delete(email);
        return send({ message: "Alias deleted." });
      }

      return send({ error: "Not found." }, 404);
    } catch (error) {
      return send(
        { error: error instanceof Error ? error.message : "Request failed." },
        400,
      );
    }
  };
}
