import { beforeEach, describe, expect, it, vi } from "vitest";
import type { useAppStore as StoreType } from "./appStore";

const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

let useAppStore: typeof StoreType;

describe("browser workflow", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal("localStorage", storage());
    ({ useAppStore } = await import("./appStore"));
  });

  it("uses the bundled server without storing tokens", async () => {
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
    expect(JSON.stringify(localStorage)).not.toContain("private-token");
  });

  it("sends session provider settings to the server, not the provider", async () => {
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
    expect(JSON.stringify(localStorage)).not.toContain("provider-secret");
  });
});
