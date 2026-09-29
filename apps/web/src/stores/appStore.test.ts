import { beforeEach, describe, expect, it, vi } from "vitest";
import type { useAppStore as StoreType } from "./appStore";

const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
};

let useAppStore: typeof StoreType;

describe("browser workflow", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.stubGlobal("localStorage", storage());
    ({ useAppStore } = await import("./appStore"));
  });

  it("uses the bundled server and remembers its token", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    useAppStore.getState().setApiConnection({ apiToken: "private-token" });
    useAppStore.getState().setConfig({ domain: "example.com" });
    await useAppStore.getState().list();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/list/example.com",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer private-token" }),
      }),
    );
    expect(JSON.parse(localStorage.getItem("eag-connection") || "{}")).toMatchObject({
      apiUrl: "/api",
      apiToken: "private-token",
      useServerProvider: true,
    });
  });

  it("sends saved provider settings to the server, not the provider", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const store = useAppStore.getState();
    store.setUseServerProvider(false);
    store.setCredentials({ apiKey: "provider-secret" });
    store.setApiConnection({ apiToken: "server-token" });
    store.setConfig({ domain: "example.com" });
    await useAppStore.getState().list();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/list/example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-EAG-Provider-Config": JSON.stringify({
            provider: "purelymail",
            credentials: { apiKey: "provider-secret" },
          }),
        }),
      }),
    );
    expect(JSON.parse(localStorage.getItem("eag-connection") || "{}")).toMatchObject({
      useServerProvider: false,
      providerId: "purelymail",
      credentials: { apiKey: "provider-secret" },
    });
  });

  it("creates a named alias using the configured domain and destination", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { email: "newsletter@example.com" } }));
    vi.stubGlobal("fetch", fetchMock);
    const store = useAppStore.getState();
    store.setApiConnection({ apiToken: "server-token" });
    store.setConfig({ domain: "example.com", destination: "me@example.com" });

    await useAppStore.getState().createAlias("newsletter");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/add/dummy",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          domain: "domain=example.com,destination=me@example.com,static=newsletter",
        }),
      }),
    );
    expect(useAppStore.getState()).toMatchObject({
      creating: false,
      status: { type: "success", message: "Created newsletter@example.com" },
      forwarders: [
        { email: "newsletter@example.com", destinations: ["me@example.com"] },
      ],
    });
  });

  it("rejects an invalid destination before contacting the server", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    useAppStore.getState().setConfig({ domain: "example.com" });

    await useAppStore.getState().createAlias();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAppStore.getState()).toMatchObject({
      creating: false,
      status: { type: "error", message: "Error: Enter a valid destination email." },
    });
  });

  it("reports an API error and clears the loading state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 })),
    );
    useAppStore.getState().setConfig({ domain: "example.com" });
    useAppStore.getState().setApiConnection({ apiToken: "invalid-token" });

    await useAppStore.getState().list();

    expect(useAppStore.getState()).toMatchObject({
      loading: false,
      status: { type: "error", message: "Error: Unauthorized" },
    });
  });

  it("deletes only after confirmation", async () => {
    const confirm = vi.fn<() => boolean>(() => false);
    vi.stubGlobal("window", { confirm });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ message: "Alias deleted." }));
    vi.stubGlobal("fetch", fetchMock);
    useAppStore.getState().setApiConnection({ apiToken: "server-token" });
    useAppStore.setState({
      forwarders: [
        { email: "newsletter@example.com", destinations: ["me@example.com"] },
      ],
    });

    await useAppStore.getState().deleteAlias("newsletter@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    await useAppStore.getState().deleteAlias("newsletter@example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/delete/newsletter%40example.com",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(useAppStore.getState().forwarders).toEqual([]);
  });

  it("restores a connection on reload and can forget its secrets", async () => {
    const store = useAppStore.getState();
    store.setApiConnection({ apiUrl: "https://api.example.com", apiToken: "token" });
    store.setUseServerProvider(false);
    store.setProviderId("mxroute");
    store.setCredentials({
      apiKey: "provider-key",
      server: "mail.example.com",
      username: "user",
    });

    vi.resetModules();
    const { useAppStore: reloaded } = await import("./appStore");
    expect(reloaded.getState()).toMatchObject({
      apiUrl: "https://api.example.com",
      apiToken: "token",
      useServerProvider: false,
      providerId: "mxroute",
      credentials: {
        apiKey: "provider-key",
        server: "mail.example.com",
        username: "user",
      },
    });

    reloaded.getState().forgetConnection();
    expect(localStorage.getItem("eag-connection")).toBeNull();
    expect(reloaded.getState()).toMatchObject({
      apiUrl: "/api",
      apiToken: "",
      credentials: { apiKey: "" },
      useServerProvider: true,
    });
  });
});
