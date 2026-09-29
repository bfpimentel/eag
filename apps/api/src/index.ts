import { createHandler } from "./handler";

const providerId = Bun.env.ALIAS_PROVIDER;
const handler = createHandler({
  token: Bun.env.SERVER_API_TOKEN || "",
  providerId,
  credentials: {
    apiKey:
      providerId === "mxroute"
        ? Bun.env.MXROUTE_API_KEY || ""
        : Bun.env.PURELYMAIL_API_KEY || "",
    server: Bun.env.MXROUTE_SERVER,
    username: Bun.env.MXROUTE_USERNAME,
  },
  allowedOrigins: (Bun.env.EAG_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
});

Bun.serve({ port: Number(Bun.env.PORT || 6123), fetch: handler });
