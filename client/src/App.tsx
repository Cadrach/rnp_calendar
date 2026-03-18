import "@mantine/core/styles.css";
import { AppShell, Group, MantineProvider, Title } from "@mantine/core";
import { theme } from "./theme";
import { Calendar } from "./components/Calendar";
import { UserBadge } from "./components/UserBadge";

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <AppShell header={{ height: 56 }}>
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Title order={4}>RNP Calendar</Title>
            <UserBadge />
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Calendar />
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
