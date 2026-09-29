import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./App";
import "./index.css";

const theme = createTheme({
  primaryColor: "gray",
  defaultRadius: "md",
  fontFamily: "Inter, system-ui, sans-serif",
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>,
);
