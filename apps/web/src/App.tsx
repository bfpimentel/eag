import { useState } from "react";
import {
  ActionIcon,
  Accordion,
  Alert,
  AppShell,
  Badge,
  Box,
  Button,
  Card,
  Container,
  CopyButton,
  Group,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { ArrowRight, Check, Copy, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAppStore } from "./stores/appStore";
import { optionsString, type AliasConfig } from "@eag/core";
import type { ProviderId } from "@eag/providers";
import classes from "./App.module.css";

export default function App() {
  const {
    config,
    providerId,
    credentials,
    useServerProvider,
    apiUrl,
    apiToken,
    forwarders,
    loading,
    creating,
    status,
    setConfig,
    setProviderId,
    setCredentials,
    setUseServerProvider,
    setApiConnection,
    list,
    createAlias,
    deleteAlias,
  } = useAppStore();
  const [staticAlias, setStaticAlias] = useState("");
  const [busyCopy, setBusyCopy] = useState(false);

  const field = (label: string, key: keyof AliasConfig, placeholder?: string) => (
    <TextInput
      label={label}
      placeholder={placeholder}
      value={config[key] || ""}
      onChange={(event) => setConfig({ [key]: event.currentTarget.value })}
    />
  );

  const createStatic = async () => {
    if (!staticAlias.trim()) return;
    await createAlias(staticAlias.trim());
    if (useAppStore.getState().status?.type === "success") setStaticAlias("");
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setBusyCopy(true);
      setTimeout(() => setBusyCopy(false), 1500);
    } catch {
      setBusyCopy(false);
    }
  };

  return (
    <AppShell header={{ height: 76 }} padding="md" className={classes.shell}>
      <AppShell.Header className={classes.header}>
        <Container size="md" h="100%">
          <Group h="100%" gap="sm">
            <ThemeIcon variant="outline" color="gray" size="lg">
              <Mail size={21} />
            </ThemeIcon>
            <Box>
              <Title order={1} size="h3" lh={1}>
                EAG
              </Title>
              <Text size="xs" c="dimmed">
                Easy Alias Generator
              </Text>
            </Box>
            <Badge ml="auto" color="gray" variant="light">
              Self-hosted
            </Badge>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md" py="xl">
          <Stack gap="xl">
            <Box>
              <Title order={2}>Your aliases, your provider.</Title>
              <Text c="dimmed" mt="xs">
                Create and manage forwarding addresses through your EAG server. Provider
                requests stay on your server, not in the browser.
              </Text>
            </Box>
            <Card withBorder radius="md" padding="lg">
              <Stack>
                <Group justify="space-between">
                  <Title order={3} size="h4">
                    1. Connect to EAG
                  </Title>
                  <Badge color="gray" variant="outline">
                    Session only
                  </Badge>
                </Group>
                <TextInput
                  label="Server URL"
                  description="Use /api for the bundled web app or a full URL for a separate server."
                  value={apiUrl}
                  onChange={(e) => setApiConnection({ apiUrl: e.currentTarget.value })}
                />
                <PasswordInput
                  label="Server API token"
                  value={apiToken}
                  onChange={(e) =>
                    setApiConnection({ apiToken: e.currentTarget.value })
                  }
                  autoComplete="off"
                />
                <Switch
                  label="Use provider configured on the server"
                  checked={useServerProvider}
                  onChange={(e) => setUseServerProvider(e.currentTarget.checked)}
                />
                {!useServerProvider && (
                  <>
                    <Text size="sm" c="dimmed">
                      Provide credentials for this session. They are sent to your EAG
                      server, which calls the provider on your behalf.
                    </Text>
                    <Select
                      label="Provider"
                      data={[
                        { value: "purelymail", label: "Purelymail" },
                        { value: "mxroute", label: "MXRoute" },
                      ]}
                      value={providerId}
                      onChange={(value) => value && setProviderId(value as ProviderId)}
                      allowDeselect={false}
                    />
                    {providerId === "mxroute" && (
                      <Group grow align="start">
                        <TextInput
                          label="MXRoute server"
                          placeholder="server.mxrouting.net"
                          value={credentials.server || ""}
                          onChange={(e) =>
                            setCredentials({ server: e.currentTarget.value })
                          }
                        />
                        <TextInput
                          label="Control panel username"
                          value={credentials.username || ""}
                          onChange={(e) =>
                            setCredentials({ username: e.currentTarget.value })
                          }
                        />
                      </Group>
                    )}
                    <PasswordInput
                      label={
                        providerId === "mxroute"
                          ? "MXRoute API key"
                          : "Purelymail API key"
                      }
                      value={credentials.apiKey}
                      onChange={(e) =>
                        setCredentials({ apiKey: e.currentTarget.value })
                      }
                      autoComplete="off"
                    />
                  </>
                )}
                <Text size="xs" c="dimmed">
                  Tokens and provider keys are cleared on reload. Domain, destination,
                  and generation settings are saved in this browser.
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" padding="lg">
              <Stack>
                <Title order={3} size="h4">
                  2. Create an alias
                </Title>
                <Group grow align="start">
                  {field("Domain", "domain", "example.com")}
                  {field("Forward to", "destination", "you@example.com")}
                </Group>
                <Group align="end">
                  <Button
                    loading={creating}
                    leftSection={<Plus size={16} />}
                    onClick={() => void createAlias()}
                  >
                    Generate alias
                  </Button>
                  <TextInput
                    label="Or choose a name"
                    placeholder="newsletter"
                    value={staticAlias}
                    onChange={(e) => setStaticAlias(e.currentTarget.value)}
                  />
                  <Button
                    variant="default"
                    loading={creating}
                    disabled={!staticAlias.trim()}
                    onClick={() => void createStatic()}
                  >
                    Create named alias
                  </Button>
                </Group>
                {status && (
                  <Alert
                    color={status.type === "error" ? "red" : "gray"}
                    title={status.type === "error" ? "Something went wrong" : "Done"}
                  >
                    {status.message}
                  </Alert>
                )}
              </Stack>
            </Card>
            <Card withBorder radius="md" padding="lg">
              <Stack>
                <Group justify="space-between">
                  <Box>
                    <Title order={3} size="h4">
                      Your aliases
                    </Title>
                    <Text c="dimmed" size="sm">
                      Forwarding addresses on {config.domain || "your domain"}
                    </Text>
                  </Box>
                  <Button
                    variant="default"
                    leftSection={<RefreshCw size={16} />}
                    loading={loading}
                    onClick={() => void list()}
                  >
                    Refresh
                  </Button>
                </Group>
                {!forwarders.length && (
                  <Box className={classes.empty}>
                    <Mail size={30} />
                    <Text mt="sm">
                      No aliases loaded yet. Connect your provider and refresh to see
                      them.
                    </Text>
                  </Box>
                )}
                {forwarders.map((item) => (
                  <Group
                    key={item.email}
                    justify="space-between"
                    className={classes.row}
                    wrap="nowrap"
                  >
                    <Box style={{ minWidth: 0 }}>
                      <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                        {item.email}
                      </Text>
                      <Group gap={4}>
                        <ArrowRight size={14} />
                        <Text size="sm" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                          {item.destinations?.join(", ") || "No destination"}
                        </Text>
                      </Group>
                    </Box>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label={`Copy ${item.email}`}
                        onClick={() => void copy(item.email)}
                      >
                        {busyCopy ? <Check size={17} /> : <Copy size={17} />}
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`Delete ${item.email}`}
                        onClick={() => void deleteAlias(item.email)}
                      >
                        <Trash2 size={17} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Card>
            <Accordion variant="contained" radius="md">
              <Accordion.Item value="bitwarden">
                <Accordion.Control>
                  <Group gap="sm">
                    <Title order={3} size="h4">
                      Bitwarden integration
                    </Title>
                    <Badge color="gray" variant="light">
                      Optional
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack>
                    <Text size="sm" c="dimmed">
                      Generate a configuration string for Bitwarden’s Addy.io
                      forwarded-alias generator. Bitwarden calls the same EAG server;
                      configure a provider on the server via environment variables.
                    </Text>
                    <Group grow align="start">
                      {field("Template", "template", "<slug> or <slug><hex>")}
                      {field("Prefix", "prefix")}
                      {field("Suffix", "suffix")}
                    </Group>
                    <Group grow align="start">
                      {field("Slug length", "slugLength", "2")}
                      {field("Hex length", "hexLength", "6")}
                      {field("Alias separator", "aliasSeparator", "_")}
                      {field("Slug separator", "slugSeparator", "_")}
                    </Group>
                    <TextInput
                      label="Bitwarden Email domain field"
                      readOnly
                      value={optionsString(config)}
                      rightSection={
                        <CopyButton value={optionsString(config)}>
                          {({ copied, copy: copyOptions }) => (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              onClick={copyOptions}
                              aria-label="Copy Bitwarden options"
                            >
                              {copied ? <Check size={16} /> : <Copy size={16} />}
                            </ActionIcon>
                          )}
                        </CopyButton>
                      }
                    />
                    <Text size="sm">
                      In Bitwarden select{" "}
                      <b>Generator → Username → Forwarded email alias → Addy.io</b>.
                      Paste the string above into <b>Email domain</b>, enter your EAG
                      API token and the public server URL ending in /add. Bitwarden
                      cannot use provider credentials entered only in this web session.
                    </Text>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            <Text size="xs" c="dimmed" ta="center">
              EAG · Open source · Your credentials, your control.
            </Text>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
