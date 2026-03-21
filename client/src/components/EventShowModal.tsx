import { useState } from "react";
import { Anchor, Button, Group, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { getEventsIndexQueryKey } from "../api/generated/event/event";
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
  const { games, rooms, scenarios, members, user } = useDictionary();
  const queryClient = useQueryClient();
  // Search all cached events index queries (the Calendar uses a parameterized one)
  // without triggering any new request.
  const allCachedEvents = queryClient
    .getQueriesData<Event[]>({ queryKey: getEventsIndexQueryKey() })
    .flatMap(([, data]) => data ?? []);
  const event = allCachedEvents.find((e) => e.id === Number(eventId));
  const [editing, setEditing] = useState(false);

  const invalidateShow = () =>
    queryClient.invalidateQueries({ queryKey: getEventsIndexQueryKey() });

  const registerMutation = useEventsRegister({ mutation: { onSuccess: invalidateShow } });
  const unregisterMutation = useEventsUnregister({ mutation: { onSuccess: invalidateShow } });

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
    <Stack>
      <Stack gap={4}>
        <Row label="Date">
          <Text size="sm">
            {format(start, "PPP", { locale: fr })}, {format(start, "HH'h'mm")} →{" "}
            {format(end, "HH'h'mm")}
          </Text>
        </Row>

        <Row label="MJ">
          {mj ? <MemberAvatar member={mj} /> : <Text size="sm">—</Text>}
        </Row>

        <Row label="Salle">{roomLabel}</Row>

        <Row label="Jeu">
          <Text size="sm">{game?.name ?? "—"}</Text>
        </Row>

        {scenario && (
          <Row label="Scénario">
            <Text size="sm">{scenario.name}</Text>
          </Row>
        )}

        {(event.min_players != null || event.max_players != null) && (
          <Row label="Joueurs">
            <Text size="sm">
              {event.min_players ?? "?"} – {event.max_players ?? "∞"}
            </Text>
          </Row>
        )}

        {playerIds.length > 0 && (
          <Row label="Inscrits">
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
        )}
      </Stack>

      <Group mt="sm" align="center">
        {canEdit && <DeleteEventButton eventId={Number(eventId)} />}
        {!isClosed && (
          <Group grow flex={1}>
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
      </Group>
    </Stack>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" w={80} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      {children}
    </Group>
  );
}
