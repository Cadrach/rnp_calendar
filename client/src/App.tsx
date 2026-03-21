import "@mantine/core/styles.css";
import { AppShell, Burger, Divider, Group, MantineProvider, NavLink, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandDiscord, IconCalendar, IconLogout, IconSettings, IconShieldLock } from "@tabler/icons-react";
import { Route, Routes, useNavigate, useLocation } from "react-router";
import { theme } from "./theme";
import { Calendar } from "./components/Calendar";
import { UserBadge } from "./components/UserBadge";
import { Login } from "./pages/Login";
import { DictionaryProvider } from "./contexts/DictionaryContext";
import { useDictionary } from "./contexts/DictionaryContext";
import { usePostAuthLogout } from "./api/generated/default/default";
import { RoomRulesTable } from "./components/admin/RoomRulesTable";
import { GamesTable } from "./components/admin/GamesTable";
import { RoomsTable } from "./components/admin/RoomsTable";

// ── Admin pages registry ───────────────────────────────────────────────────────
// Add new CRUD pages here; they'll appear automatically in the admin nav section.

const ADMIN_PAGES = [
  { label: "Règles des salles", path: "/admin/room-rules", icon: <IconSettings size={16} /> },
  { label: "Jeux", path: "/admin/games", icon: <IconSettings size={16} /> },
  { label: "Salles", path: "/admin/rooms", icon: <IconSettings size={16} /> },
];

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell() {
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, discordGuildId } = useDictionary();

  const logout = usePostAuthLogout({
    mutation: { onSuccess: () => navigate("/login") },
  });

  const navTo = (path: string) => {
    navigate(path);
    closeNav();
  };

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
        <Stack gap={4} style={{ flex: 1 }}>
          <NavLink
            label="Calendrier"
            leftSection={<IconCalendar size={16} />}
            active={location.pathname === "/" || location.pathname.startsWith("/show")}
            onClick={() => navTo("/")}
            variant="subtle"
            color="neon"
          />
          {discordGuildId && (
            <NavLink
              label="Discord"
              leftSection={<IconBrandDiscord size={16} />}
              href={`https://discord.com/channels/${discordGuildId}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="indigo"
            />
          )}

          {user.is_admin && (
            <>
              <Divider my={4} />
              <Text size="xs" c="dimmed" px="sm" py={2} tt="uppercase" fw={600} style={{ letterSpacing: "0.08em" }}>
                <Group gap={6}>
                  <IconShieldLock size={12} />
                  Administration
                </Group>
              </Text>
              {ADMIN_PAGES.map((page) => (
                <NavLink
                  key={page.path}
                  label={page.label}
                  leftSection={page.icon}
                  active={location.pathname === page.path}
                  onClick={() => navTo(page.path)}
                  variant="subtle"
                  color="neon"
                />
              ))}
            </>
          )}
        </Stack>

        <Divider my={4} />
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
          <Route path="/admin/room-rules" element={<RoomRulesTable />} />
          <Route path="/admin/games" element={<GamesTable />} />
          <Route path="/admin/rooms" element={<RoomsTable />} />
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
