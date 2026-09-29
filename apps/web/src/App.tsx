import { useEffect, useState } from "react";
import {
  Accordion,
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Card,
  Container,
  CopyButton,
  Divider,
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
import { notifications } from "@mantine/notifications";
import { ArrowRight, Check, Copy, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import { optionsString, type AliasConfig } from "@eag/core";
import type { ProviderId } from "@eag/providers";
import { useAppStore } from "./stores/appStore";
import classes from "./App.module.css";

function ConnectionSection() {
  const {
    apiUrl,
    apiToken,
    providerId,
    credentials,
    useServerProvider,
    setApiConnection,
    setProviderId,
    setCredentials,
    setUseServerProvider,
    forgetConnection,
  } = useAppStore();

  return (
    <Accordion variant="contained" radius="md" defaultValue="connection">
      <Accordion.Item value="connection">
        <Accordion.Control>
          <Group gap="sm">
            <Title order={3} size="h4">
              1. Connect to EAG
            </Title>
            <Badge color="gray" variant="outline">
              Saved in browser
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <TextInput
              label="Server URL"
              description="Use /api for the bundled web app or a full URL for a separate server."
              value={apiUrl}
              onChange={(event) =>
                setApiConnection({ apiUrl: event.currentTarget.value })
              }
            />
            <PasswordInput
              label="Server API token"
              value={apiToken}
              onChange={(event) =>
                setApiConnection({ apiToken: event.currentTarget.value })
              }
              autoComplete="off"
            />
            <Switch
              label="Use provider configured on the server"
              checked={useServerProvider}
              onChange={(event) => setUseServerProvider(event.currentTarget.checked)}
            />
            {!useServerProvider && (
              <>
                <Text size="sm" c="dimmed">
                  These credentials are saved in this browser and sent to your EAG
                  server when you manage aliases.
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
                      onChange={(event) =>
                        setCredentials({ server: event.currentTarget.value })
                      }
                    />
                    <TextInput
                      label="Control panel username"
                      value={credentials.username || ""}
                      onChange={(event) =>
                        setCredentials({ username: event.currentTarget.value })
                      }
                    />
                  </Group>
                )}
                <PasswordInput
                  label={
                    providerId === "mxroute" ? "MXRoute API key" : "Purelymail API key"
                  }
                  value={credentials.apiKey}
                  onChange={(event) =>
                    setCredentials({ apiKey: event.currentTarget.value })
                  }
                  autoComplete="off"
                />
              </>
            )}
            <Text size="xs" c="dimmed">
              Server tokens and provider keys are saved in this browser's local storage.
              Anyone with access to this browser or scripts on this site can read them.
            </Text>
            <Group justify="flex-end">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={forgetConnection}
              >
                Forget saved connection
              </Button>
            </Group>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function TargetSection() {
  const { config, setConfig } = useAppStore();

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack>
        <Title order={3} size="h4">
          2. Set the target domain
        </Title>
        <TextInput
          label="Domain"
          placeholder="example.com"
          value={config.domain}
          onChange={(event) => setConfig({ domain: event.currentTarget.value })}
        />
      </Stack>
    </Card>
  );
}

function CreateSection() {
  const { config, setConfig, creating, createAlias } = useAppStore();
  const [aliasName, setAliasName] = useState("");
  const name = aliasName.trim();

  const submit = async () => {
    await createAlias(name || undefined);
    if (name && useAppStore.getState().status?.type === "success") {
      setAliasName("");
    }
  };

  return (
    <Card withBorder radius="md" padding="lg">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack>
          <Title order={3} size="h4">
            3. Create an alias
          </Title>
          <TextInput
            label="Forward to"
            placeholder="you@example.com"
            value={config.destination}
            onChange={(event) => setConfig({ destination: event.currentTarget.value })}
          />
          <TextInput
            label="Alias name (optional)"
            description="Leave blank to generate a random name."
            placeholder="newsletter"
            value={aliasName}
            onChange={(event) => setAliasName(event.currentTarget.value)}
          />
          {name && config.domain && (
            <Text size="sm" c="dimmed" aria-live="polite">
              Preview: {name}@{config.domain}
            </Text>
          )}
          <Group justify="flex-end">
            <Button type="submit" loading={creating} leftSection={<Plus size={16} />}>
              {name ? "Create named alias" : "Generate alias"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

function GenerationOptionsSection() {
  const { config, setConfig } = useAppStore();
  const field = (label: string, key: keyof AliasConfig, placeholder?: string) => (
    <TextInput
      label={label}
      placeholder={placeholder}
      value={config[key] || ""}
      onChange={(event) => setConfig({ [key]: event.currentTarget.value })}
    />
  );
  const value = optionsString(config);

  return (
    <Accordion variant="contained" radius="md">
      <Accordion.Item value="generation">
        <Accordion.Control>
          <Group gap="sm">
            <Title order={3} size="h4">
              Alias generation options
            </Title>
            <Badge color="gray" variant="light">
              Optional
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text size="sm" c="dimmed">
              Customize the names EAG generates when you select Generate alias. Named
              aliases use the name you enter instead of these options.
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
            <Divider />
            <Title order={4} size="h5">
              Bitwarden integration
            </Title>
            <Text size="sm" c="dimmed">
              To use these options in Bitwarden, copy the value below into its Email
              domain field. Bitwarden calls the same EAG server, which must have a
              provider configured through environment variables.
            </Text>
            <TextInput
              label="Bitwarden Email domain field"
              readOnly
              value={value}
              rightSection={
                <CopyButton value={value}>
                  {({ copied, copy }) => (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        copy();
                        notifications.show({
                          message: "Bitwarden Email domain value copied",
                          color: "gray",
                        });
                      }}
                      aria-label="Copy Bitwarden Email domain value"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </ActionIcon>
                  )}
                </CopyButton>
              }
            />
            <Text size="sm">
              In Bitwarden select{" "}
              <b>Generator → Username → Forwarded email alias → Addy.io</b>. Paste the
              string above into <b>Email domain</b>, enter your EAG API token and the
              public server URL ending in /add. Bitwarden cannot use provider
              credentials entered only in the web UI.
            </Text>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function AliasesSection() {
  const { config, forwarders, loading, list, deleteAlias } = useAppStore();

  return (
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
              No aliases loaded yet. Connect to EAG and refresh to see them.
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
              <CopyButton value={item.email}>
                {({ copied, copy }) => (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={`Copy ${item.email}`}
                    onClick={() => {
                      copy();
                      notifications.show({ message: "Alias copied", color: "gray" });
                    }}
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </ActionIcon>
                )}
              </CopyButton>
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
  );
}

export default function App() {
  const status = useAppStore((state) => state.status);

  useEffect(() => {
    if (status) {
      notifications.show({
        title: status.type === "error" ? "Something went wrong" : "Done",
        message: status.message,
        color: status.type === "error" ? "red" : "gray",
      });
    }
  }, [status]);

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
            <ConnectionSection />
            <TargetSection />
            <CreateSection />
            <GenerationOptionsSection />
            <AliasesSection />
            <Text size="xs" c="dimmed" ta="center">
              EAG · Open source · Your credentials, your control.
            </Text>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
