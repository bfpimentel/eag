import { create } from "zustand";
import type { Credentials, Forwarder, ProviderId } from "@eag/providers";
import { generateAlias, type AliasConfig } from "@eag/core";
import { createApiProvider, type ProviderOverride } from "../apiProvider";

const CONFIG_KEY = "eag-config";
const CONNECTION_KEY = "eag-connection";

type ConnectionSettings = {
  apiUrl: string;
  apiToken: string;
  providerId: ProviderId;
  credentials: Credentials;
  useServerProvider: boolean;
};

const defaultConnection: ConnectionSettings = {
  apiUrl: "/api",
  apiToken: "",
  providerId: "purelymail",
  credentials: { apiKey: "" },
  useServerProvider: true,
};

function loadConnection(): ConnectionSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(CONNECTION_KEY) || "null");
    if (!saved || typeof saved !== "object") return defaultConnection;
    return {
      apiUrl: typeof saved.apiUrl === "string" ? saved.apiUrl : "/api",
      apiToken: typeof saved.apiToken === "string" ? saved.apiToken : "",
      providerId: saved.providerId === "mxroute" ? "mxroute" : "purelymail",
      credentials: {
        apiKey:
          typeof saved.credentials?.apiKey === "string" ? saved.credentials.apiKey : "",
        server:
          typeof saved.credentials?.server === "string"
            ? saved.credentials.server
            : undefined,
        username:
          typeof saved.credentials?.username === "string"
            ? saved.credentials.username
            : undefined,
      },
      useServerProvider:
        typeof saved.useServerProvider === "boolean" ? saved.useServerProvider : true,
    };
  } catch {
    return defaultConnection;
  }
}

function saveConnection(settings: ConnectionSettings): void {
  localStorage.setItem(
    CONNECTION_KEY,
    JSON.stringify({
      apiUrl: settings.apiUrl,
      apiToken: settings.apiToken,
      providerId: settings.providerId,
      credentials: settings.credentials,
      useServerProvider: settings.useServerProvider,
    }),
  );
}

function initialConfig(): AliasConfig {
  try {
    const saved =
      localStorage.getItem(CONFIG_KEY) ||
      localStorage.getItem("bitwarden_alias_config");
    return {
      domain: "",
      destination: "",
      ...(saved ? (JSON.parse(saved) as Partial<AliasConfig>) : {}),
    };
  } catch {
    return { domain: "", destination: "" };
  }
}

type Status = { type: "success" | "error"; message: string } | null;
type State = {
  config: AliasConfig;
  providerId: ProviderId;
  credentials: Credentials;
  useServerProvider: boolean;
  apiUrl: string;
  apiToken: string;
  forwarders: Forwarder[];
  loading: boolean;
  creating: boolean;
  status: Status;
  setConfig: (patch: Partial<AliasConfig>) => void;
  setProviderId: (id: ProviderId) => void;
  setCredentials: (patch: Partial<Credentials>) => void;
  setUseServerProvider: (useServerProvider: boolean) => void;
  setApiConnection: (patch: { apiUrl?: string; apiToken?: string }) => void;
  forgetConnection: () => void;
  list: () => Promise<void>;
  createAlias: (staticAlias?: string) => Promise<void>;
  deleteAlias: (email: string) => Promise<void>;
};

export const useAppStore = create<State>((set, get) => {
  const provider = () => {
    const state = get();
    const override: ProviderOverride | undefined = state.useServerProvider
      ? undefined
      : { provider: state.providerId, credentials: state.credentials };
    return createApiProvider(state.apiUrl, state.apiToken, override);
  };

  return {
    config: initialConfig(),
    ...loadConnection(),
    forwarders: [],
    loading: false,
    creating: false,
    status: null,
    setConfig: (patch) =>
      set((state) => {
        const config = { ...state.config, ...patch };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        return {
          config,
          forwarders:
            patch.domain !== undefined && patch.domain !== state.config.domain
              ? []
              : state.forwarders,
        };
      }),
    setProviderId: (providerId) =>
      set((state) => {
        const next = { ...state, providerId, credentials: { apiKey: "" } };
        saveConnection(next);
        return {
          providerId,
          credentials: next.credentials,
          forwarders: [],
          status: null,
        };
      }),
    setCredentials: (patch) =>
      set((state) => {
        const credentials = { ...state.credentials, ...patch };
        saveConnection({ ...state, credentials });
        return { credentials };
      }),
    setUseServerProvider: (useServerProvider) =>
      set((state) => {
        saveConnection({ ...state, useServerProvider });
        return { useServerProvider, forwarders: [], status: null };
      }),
    setApiConnection: (patch) =>
      set((state) => {
        const apiUrl = patch.apiUrl ?? state.apiUrl;
        const apiToken = patch.apiToken ?? state.apiToken;
        saveConnection({ ...state, apiUrl, apiToken });
        return { apiUrl, apiToken, forwarders: [], status: null };
      }),
    forgetConnection: () => {
      localStorage.removeItem(CONNECTION_KEY);
      set({
        ...defaultConnection,
        forwarders: [],
        status: {
          type: "success",
          message: "Saved connection removed",
        },
      });
    },

    list: async () => {
      set({ loading: true, status: null });
      try {
        const { config } = get();
        if (!config.domain) throw new Error("Enter a domain first.");
        set({ forwarders: await provider().list(config.domain) });
      } catch (error) {
        set({ status: { type: "error", message: String(error) } });
      } finally {
        set({ loading: false });
      }
    },

    createAlias: async (staticAlias) => {
      set({ creating: true, status: null });
      try {
        const { config } = get();
        const alias = generateAlias({ ...config, static: staticAlias });
        const result = await provider().create(
          config.domain,
          config.destination,
          alias,
        );
        set((state) => ({
          forwarders: state.forwarders.some((item) => item.email === result.email)
            ? state.forwarders
            : [result, ...state.forwarders],
          status: { type: "success", message: `Created ${result.email}` },
        }));
      } catch (error) {
        set({ status: { type: "error", message: String(error) } });
      } finally {
        set({ creating: false });
      }
    },

    deleteAlias: async (email) => {
      if (!window.confirm(`Delete ${email}?`)) return;
      try {
        await provider().delete(email);
        set((state) => ({
          forwarders: state.forwarders.filter((item) => item.email !== email),
          status: { type: "success", message: `Deleted ${email}` },
        }));
      } catch (error) {
        set({ status: { type: "error", message: String(error) } });
      }
    },
  };
});
