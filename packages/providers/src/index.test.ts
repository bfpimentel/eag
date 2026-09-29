import { afterEach, expect, test, mock } from "bun:test";
import { createProvider } from "./index";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("MXRoute uses its API headers and normalizes creation", async () => {
  const fetchMock = mock(async () => Response.json({ data: {} }));
  globalThis.fetch = fetchMock as typeof fetch;
  const result = await createProvider("mxroute", {
    server: "mx.example",
    username: "user",
    apiKey: "secret",
  }).create("example.com", "me@example.com", "test");
  expect(result.email).toBe("test@example.com");
  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    "https://api.mxroute.com/domains/example.com/forwarders",
  );
  expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
    "X-API-Key": "secret",
  });
});

test("Purelymail deletes by rule id, not address", async () => {
  const fetchMock = mock(async (_url: string, init: RequestInit) =>
    Response.json(
      JSON.parse(init.body as string).routingRuleId
        ? {}
        : {
            result: {
              rules: [
                {
                  id: 42,
                  domainName: "example.com",
                  matchUser: "test",
                  targetAddresses: ["me@example.com"],
                },
              ],
            },
          },
    ),
  );
  globalThis.fetch = fetchMock as typeof fetch;
  await createProvider("purelymail", { apiKey: "secret" }).delete("test@example.com");
  expect(
    JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string),
  ).toEqual({ routingRuleId: 42 });
});
