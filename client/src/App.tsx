import "@mantine/core/styles.css";
import { AppShell, Burger, Group, MantineProvider, NavLink, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLogout } from "@tabler/icons-react";
import { Route, Routes, useNavigate } from "react-router";
import { theme } from "./theme";
import { Calendar } from "./components/Calendar";
import { UserBadge } from "./components/UserBadge";
import { Login } from "./pages/Login";
import { DictionaryProvider } from "./contexts/DictionaryContext";
import { usePostAuthLogout } from "./api/generated/default/default";

function Shell() {
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const navigate = useNavigate();

  const logout = usePostAuthLogout({
    mutation: {
      onSuccess: () => navigate("/login"),
    },
  });

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !navOpened, desktop: !navOpened } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={navOpened}
              onClick={toggleNav}
              size="sm"
              color="#00d4e8"
              style={{
                filter: "drop-shadow(0 0 4px rgba(0,212,232,0.8)) drop-shadow(0 0 10px rgba(0,212,232,0.5))",
              }}
            />
            <Title
              order={4}
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#00d4e8",
                textShadow:
                  "0 0 6px #00d4e8, 0 0 16px rgba(0,212,232,0.9), 0 0 40px rgba(0,212,232,0.6), 0 0 80px rgba(0,212,232,0.3)",
              }}
            >
              RNP Calendar
            </Title>
          </Group>
          <UserBadge />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <NavLink
          label="Déconnexion"
          leftSection={<IconLogout size={16} />}
          onClick={() => { closeNav(); logout.mutate(); }}
          disabled={logout.isPending}
          color="red"
          variant="subtle"
        />
      </AppShell.Navbar>

      <AppShell.Main p={0}>
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route path="/show/:id" element={<Calendar />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <DictionaryProvider>
              <Shell />
            </DictionaryProvider>
          }
        />
      </Routes>
    </MantineProvider>
  );
}
