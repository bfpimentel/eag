// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { useAppStore } from "./stores/appStore";
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

afterEach(() => {
  notifications.clean();
  useAppStore.setState({ status: null });
  document.body.replaceChildren();
});

it("mounts the app and displays operation errors as toasts", async () => {
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);

  await act(async () => {
    root.render(
      <MantineProvider defaultColorScheme="dark">
        <Notifications />
        <App />
      </MantineProvider>,
    );
  });
  expect(element.textContent).toContain("EAG");

  await act(async () => {
    useAppStore.setState({ status: { type: "error", message: "Connection failed" } });
  });
  expect(document.body.textContent).toContain("Connection failed");
  expect(element.textContent).not.toContain("Connection failed");

  await act(async () => root.unmount());
});
