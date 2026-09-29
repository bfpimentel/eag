export type Forwarder = { email: string; destinations: string[]; id?: string | number };

export type ProviderId = "mxroute" | "purelymail";
export type Credentials = { apiKey: string; server?: string; username?: string };

export interface Provider {
  create(domain: string, destination: string, alias: string): Promise<Forwarder>;

  list(domain: string): Promise<Forwarder[]>;

  delete(email: string): Promise<void>;
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok)
    throw new Error(
      `Provider request failed (${response.status}). ` +
        "Check credentials and provider configuration.",
    );
  if (response.status === 204) return null;
  return response.json();
}

class MXRoute implements Provider {
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
    if (!credentials.server || !credentials.username || !credentials.apiKey)
      throw new Error("MXRoute server, username and API key are required.");
  }

  private headers(): HeadersInit {
    return {
      "X-Server": this.credentials.server!,
      "X-Username": this.credentials.username!,
      "X-API-Key": this.credentials.apiKey,
      "Content-Type": "application/json",
    };
  }

  private endpoint(domain: string) {
    return `https://api.mxroute.com/domains/${encodeURIComponent(domain)}/forwarders`;
  }

  async create(domain: string, destination: string, alias: string): Promise<Forwarder> {
    await request(this.endpoint(domain), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ alias, destinations: [destination] }),
    });
    return { email: `${alias}@${domain}`, destinations: [destination] };
  }

  async list(domain: string): Promise<Forwarder[]> {
    const result = (await request(this.endpoint(domain), {
      headers: this.headers(),
    })) as { data: Forwarder[] };
    return result.data;
  }

  async delete(email: string): Promise<void> {
    const [alias, domain] = splitEmail(email);
    await request(`${this.endpoint(domain)}/${encodeURIComponent(alias)}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }
}

class Purelymail implements Provider {
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
    if (!credentials.apiKey) throw new Error("Purelymail API key is required.");
  }

  private call(path: string, body: unknown): Promise<unknown> {
    return request(`https://purelymail.com/api/v0/${path}`, {
      method: "POST",
      headers: {
        "Purelymail-Api-Token": this.credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private async rules(): Promise<
    Array<{
      id: number;
      domainName: string;
      matchUser: string;
      targetAddresses: string[];
    }>
  > {
    const data = (await this.call("listRoutingRules", {})) as {
      result: {
        rules: Array<{
          id: number;
          domainName: string;
          matchUser: string;
          targetAddresses: string[];
        }>;
      };
    };
    return data.result.rules;
  }

  async create(domain: string, destination: string, alias: string): Promise<Forwarder> {
    await this.call("createRoutingRule", {
      domainName: domain,
      prefix: true,
      matchUser: alias,
      targetAddresses: [destination],
      catchall: false,
    });
    return { email: `${alias}@${domain}`, destinations: [destination] };
  }

  async list(domain: string): Promise<Forwarder[]> {
    return (await this.rules())
      .filter((rule) => rule.domainName === domain)
      .map((rule) => ({
        id: rule.id,
        email: `${rule.matchUser}@${rule.domainName}`,
        destinations: rule.targetAddresses,
      }));
  }

  async delete(email: string): Promise<void> {
    const [, domain] = splitEmail(email);
    const rule = (await this.list(domain)).find((item) => item.email === email);
    if (rule?.id === undefined) throw new Error("Alias not found.");
    await this.call("deleteRoutingRule", { routingRuleId: rule.id });
  }
}

function splitEmail(email: string): [string, string] {
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1])
    throw new Error("Invalid email address.");
  return parts as [string, string];
}

export function createProvider(id: ProviderId, credentials: Credentials): Provider {
  switch (id) {
    case "mxroute":
      return new MXRoute(credentials);
    case "purelymail":
      return new Purelymail(credentials);
    default:
      throw new Error("Unsupported provider.");
  }
}
