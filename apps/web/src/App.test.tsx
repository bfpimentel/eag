// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import App from "./App";

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
}));

afterEach(() => document.body.replaceChildren());

it("renders the main UI", async () => {
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);

  await act(async () => {
    root.render(
      <MantineProvider defaultColorScheme="dark">
        <App />
      </MantineProvider>,
    );
  });

  expect(element.textContent).toContain("Easy Alias Generator");
  await act(async () => root.unmount());
});
