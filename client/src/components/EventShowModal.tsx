import { useState } from "react";
import { ActionIcon, Anchor, Button, Divider, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconCalendar,
  IconUser,
  IconDoor,
  IconBooks,
  IconBookmark,
  IconUsers,
  IconUsersGroup,
  IconBrandDiscord,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { getEventsIndexQueryKey, getEventsShowQueryKey, useEventsShow } from "../api/generated/event/event";
import type { Event } from "../api/generated/model";
import { useDictionary } from "../contexts/DictionaryContext";
import { useEventsRegister, useEventsUnregister } from "../api/event-register";
import { MemberAvatar } from "./MemberAvatar";
import { CreateEventModal } from "./CreateEventModal";
import { DeleteEventButton } from "./DeleteEventButton";

interface Props {
  eventId: string;
}

export function EventShowModal({ eventId }: Props) {
  const { games, rooms, scenarios, members, user, discordGuildId } = useDictionary();
  const queryClient = useQueryClient();

  // Search all cached events index queries (the Calendar uses a parameterized one)
  const allCachedEvents = queryClient
    .getQueriesData<Event[]>({ queryKey: getEventsIndexQueryKey() })
    .flatMap(([, data]) => data ?? []);
  const cachedEvent = allCachedEvents.find((e) => e.id === Number(eventId));

  // Fetch from API if not in cache
  const { data: fetchedEvent, isLoading } = useEventsShow(Number(eventId), {
    query: { enabled: !cachedEvent },
  });

  const event = cachedEvent ?? fetchedEvent;
  const [editing, setEditing] = useState(false);

  const invalidateShow = () => {
    queryClient.invalidateQueries({ queryKey: getEventsIndexQueryKey() });
    queryClient.invalidateQueries({ queryKey: getEventsShowQueryKey(Number(eventId)) });
  };

  const registerMutation = useEventsRegister({ mutation: { onSuccess: invalidateShow } });
  const unregisterMutation = useEventsUnregister({ mutation: { onSuccess: invalidateShow } });

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader color="neon" />
      </Stack>
    );
  }

  if (!event) return null;

  if (editing) {
    return (
      <CreateEventModal
        start={new Date(event.datetime_start)}
        end={new Date(event.datetime_end)}
        event={event}
        onClose={() => setEditing(false)}
      />
    );
  }

  const game = games.find((g) => g.id === event.game_id);
  const room = rooms.find((r) => r.id === event.room_id);
  const scenario = event.scenario_id ? scenarios.find((s) => s.id === event.scenario_id) : null;
  const mj = members.find((m) => m.id === event.mj_discord_id);

  const start = new Date(event.datetime_start);
  const end = new Date(event.datetime_end);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const durationHours = Math.floor(durationMinutes / 60);
  const durationRemainder = durationMinutes % 60;
  const durationLabel =
    durationRemainder > 0 ? `${durationHours}h${String(durationRemainder).padStart(2, "0")}` : `${durationHours}h`;

  const playerIds = (event.player_ids as string[] | null) ?? [];
  const registeredCount = playerIds.length;
  const isFull = event.max_players != null && registeredCount >= event.max_players;
  const isRegistered = !!user.discord_id && playerIds.includes(user.discord_id);

  const isClosed = (event as unknown as { is_closed: boolean }).is_closed ?? false;
  const canEdit = user.is_admin || user.discord_id === event.mj_discord_id;

  const roomLabel = room?.url ? (
    <Anchor href={room.url} target="_blank" rel="noopener noreferrer">
      {room.name}
    </Anchor>
  ) : (
    <Text span>{room?.name ?? "—"}</Text>
  );

  return (
    <Stack mt="lg">
      <Stack gap="sm">
        <Row label="Date" icon={IconCalendar}>
          <Text size="md">
            {format(start, "PPP", { locale: fr })}, {format(start, "HH'h'mm")} →{" "}
            {format(end, "HH'h'mm")} ({durationLabel})
          </Text>
        </Row>

        <GlowDivider />
        <Row label="MJ" icon={IconUser}>
          {mj ? <MemberAvatar member={mj} /> : <Text size="md">—</Text>}
        </Row>

        <GlowDivider />
        <Row label="Salle" icon={IconDoor}>
          {roomLabel}
        </Row>

        <GlowDivider />
        <Row label="Jeu" icon={IconBooks}>
          <Text size="md">{game?.name ?? "—"}</Text>
        </Row>

        {scenario && (
          <>
            <GlowDivider />
            <Row label="Scénario" icon={IconBookmark}>
              <Text size="md">{scenario.name}</Text>
            </Row>
          </>
        )}

        {(event.min_players != null || event.max_players != null) && (
          <>
            <GlowDivider />
            <Row label="Joueurs" icon={IconUsers}>
              <Text size="md">
                {event.min_players ?? "1"} – {event.max_players ?? "∞"}
              </Text>
            </Row>
          </>
        )}

        {playerIds.length > 0 && (
          <>
            <GlowDivider />
            <Row label="Inscrits" icon={IconUsersGroup}>
              <Stack gap={4}>
                {playerIds.map((id) => {
                  const member = members.find((m) => m.id === id);
                  return member ? (
                    <MemberAvatar key={id} member={member} />
                  ) : (
                    <Text key={id} size="sm">
                      {id}
                    </Text>
                  );
                })}
              </Stack>
            </Row>
          </>
        )}
      </Stack>

      <Group mt="sm" align="center" justify="space-between" wrap="nowrap">
        {canEdit && <DeleteEventButton eventId={Number(eventId)} />}

        {!isClosed && (
          <Group grow flex={1} mx="xs">
            {canEdit && (
              <Button variant="default" onClick={() => setEditing(true)}>
                Modifier
              </Button>
            )}
            {isRegistered ? (
              <Button
                variant="filled"
                color="orange"
                loading={unregisterMutation.isPending}
                onClick={() =>
                  unregisterMutation.mutate({ event: Number(eventId), data: { user_id: user.id } })
                }
              >
                Se désinscrire
              </Button>
            ) : (
              <Button
                disabled={isFull}
                loading={registerMutation.isPending}
                onClick={() =>
                  registerMutation.mutate({ event: Number(eventId), data: { user_id: user.id } })
                }
              >
                {isFull ? "Complet" : "S'inscrire"}
              </Button>
            )}
          </Group>
        )}

        {discordGuildId && event.discord_thread_id && (
          <Tooltip label="Voir le post Discord">
            <ActionIcon
              component="a"
              href={`https://discord.com/channels/${discordGuildId}/${event.discord_thread_id}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="filled"
              size="lg"
              color="#7a6ff0"
            >
              <IconBrandDiscord size={20} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Stack>
  );
}

function GlowDivider() {
  return (
    <Divider
      style={{
        borderColor: "rgba(0, 212, 232, 0.2)",
        boxShadow: "0 0 6px rgba(0, 212, 232, 0.35)",
      }}
    />
  );
}

function Row({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.FC<{ size?: number; stroke?: number }>;
  children: React.ReactNode;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Group gap={6} w={100} style={{ flexShrink: 0 }} align="center">
        <Icon size={16} stroke={1.5} />
        <Text size="md" c="dimmed">
          {label}
        </Text>
      </Group>
      {children}
    </Group>
  );
}
