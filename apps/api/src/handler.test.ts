import { afterEach, expect, mock, test } from "bun:test";
import { createHandler } from "./handler";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("requires an API token before serving requests", async () => {
  const handler = createHandler({ token: "server-token" });
  const response = await handler(new Request("http://localhost:6123/list/example.com"));
  expect(response.status).toBe(401);
});

test("works standalone with environment-provided provider configuration", async () => {
  const fetchMock = mock(async () => Response.json({ data: [] }));
  globalThis.fetch = fetchMock as typeof fetch;
  const handler = createHandler({
    token: "server-token",
    providerId: "mxroute",
    credentials: { apiKey: "env-key", server: "mail.example", username: "user" },
  });
  const response = await handler(
    new Request("http://localhost:6123/list/example.com", {
      headers: { Authorization: "Bearer server-token" },
    }),
  );

  expect(response.status).toBe(200);
  expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
    "X-API-Key": "env-key",
  });
});

test("serves Bitwarden creation using the standalone provider", async () => {
  const fetchMock = mock(async () => Response.json({ data: {} }));
  globalThis.fetch = fetchMock as typeof fetch;
  const handler = createHandler({
    token: "server-token",
    providerId: "mxroute",
    credentials: { apiKey: "env-key", server: "mail.example", username: "user" },
  });
  const response = await handler(
    new Request("http://localhost:6123/add/dummy", {
      method: "POST",
      headers: {
        Authorization: "Bearer server-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: "domain=example.com,destination=me@example.com,static=newsletter",
      }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    data: { email: "newsletter@example.com" },
  });
  expect(fetchMock.mock.calls.length).toBe(1);
});

test("accepts authenticated per-request provider settings from the web UI", async () => {
  const fetchMock = mock(async () => Response.json({ result: { rules: [] } }));
  globalThis.fetch = fetchMock as typeof fetch;
  const handler = createHandler({ token: "server-token" });
  const response = await handler(
    new Request("http://localhost:6124/list/example.com", {
      headers: {
        Authorization: "Bearer server-token",
        Origin: "http://localhost:6124",
        "X-EAG-Provider-Config": JSON.stringify({
          provider: "purelymail",
          credentials: { apiKey: "session-key" },
        }),
      },
    }),
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
    "http://localhost:6124",
  );
  expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
    "Purelymail-Api-Token": "session-key",
  });
});

test("does not accept cross-origin requests without explicit permission", async () => {
  const handler = createHandler({ token: "server-token" });
  const response = await handler(
    new Request("http://localhost:6123/list/example.com", {
      method: "OPTIONS",
      headers: { Origin: "https://untrusted.example" },
    }),
  );
  expect(response.status).toBe(403);
});
