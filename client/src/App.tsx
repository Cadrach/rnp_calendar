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
    <MantineProvider theme={theme} forceColorScheme="dark">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <DictionaryProvider>
              <AppShell header={{ height: 56 }}>
                <AppShell.Header>
                  <Group h="100%" px="md" justify="space-between">
                    <Title
                      order={4}
                      style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#00d4e8",
                        textShadow: "0 0 6px #00d4e8, 0 0 16px rgba(0,212,232,0.9), 0 0 40px rgba(0,212,232,0.6), 0 0 80px rgba(0,212,232,0.3)",
                      }}
                    >
                      RNP Calendar
                    </Title>
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
