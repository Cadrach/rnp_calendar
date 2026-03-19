import "@mantine/core/styles.css";
import { AppShell, Group, MantineProvider, Title } from "@mantine/core";
import { Route, Routes } from "react-router";
import { theme } from "./theme";
import { Calendar } from "./components/Calendar";
import { UserBadge } from "./components/UserBadge";
import { Login } from "./pages/Login";
import { DictionaryProvider } from "./contexts/DictionaryContext";

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <DictionaryProvider>
              <AppShell header={{ height: 56 }}>
                <AppShell.Header>
                  <Group h="100%" px="md" justify="space-between">
                    <Title order={4}>RNP Calendar</Title>
                    <UserBadge />
                  </Group>
                </AppShell.Header>
                <AppShell.Main>
                  <Routes>
                    <Route path="/" element={<Calendar />} />
                    <Route path="/show/:id" element={<Calendar />} />
                  </Routes>
                </AppShell.Main>
              </AppShell>
            </DictionaryProvider>
          }
        />
      </Routes>
    </MantineProvider>
  );
}
