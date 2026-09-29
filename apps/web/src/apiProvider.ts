import type { Credentials, Forwarder, Provider, ProviderId } from "@eag/providers";

export type ProviderOverride = { provider: ProviderId; credentials: Credentials };

export function createApiProvider(
  url: string,
  token: string,
  override?: ProviderOverride,
): Provider {
  const base = url.replace(/\/+$/, "");
  if ((!base.startsWith("/") && !/^https?:\/\//.test(base)) || !token) {
    throw new Error("Enter a server URL and API token.");
  }

  async function call(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(override ? { "X-EAG-Provider-Config": JSON.stringify(override) } : {}),
      },
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || `Server request failed (${response.status}).`);
    }
    return data;
  }

  return {
    async create(domain, destination, alias) {
      const options = `domain=${domain},destination=${destination},static=${alias}`;
      const result = (await call("/add/dummy", {
        method: "POST",
        body: JSON.stringify({ domain: options }),
      })) as { data: { email: string } };
      return { email: result.data.email, destinations: [destination] };
    },

    async list(domain) {
      return (await call(`/list/${encodeURIComponent(domain)}`)) as Forwarder[];
    },

    async delete(email) {
      await call(`/delete/${encodeURIComponent(email)}`, { method: "DELETE" });
    },
  };
}
