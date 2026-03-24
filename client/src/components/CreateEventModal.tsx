import { useState } from "react";
import { Badge, Button, Group, Loader, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import type { Event } from "../api/generated/model";
import { getDictionaryQueryKey } from "../api/generated/dictionary/dictionary";
import {
  getEventsIndexQueryKey,
  getEventsShowQueryKey,
  useEventsStore,
  useEventsUpdate,
} from "../api/generated/event/event";
import { useRoomFreeSlots } from "../api/generated/room/room";
import { useDictionary } from "../contexts/DictionaryContext";
import { EventDateRangePicker } from "./EventDateRangePicker";
import { MembersSelect } from "./MembersSelect";
import { ScenarioSelect } from "./ScenarioSelect";

interface FreeSlot {
  start: string;
  end: string;
}

interface Props {
  start: Date;
  end: Date;
  onClose: () => void;
  event?: Event;
  initialRoomId?: number | null;
}

export function CreateEventModal({ start, end, onClose, event, initialRoomId }: Props) {
  const { user, games, rooms, members } = useDictionary();
  const queryClient = useQueryClient();

  const mjDiscordId = event ? event.mj_discord_id : user.discord_id;

  const [editStart, setEditStart] = useState(start);
  const [editEnd, setEditEnd] = useState(end);

  const form = useForm({
    initialValues: {
      room_id: event?.room_id
        ? String(event.room_id)
        : initialRoomId
          ? String(initialRoomId)
          : (null as string | null),
      game_id: event?.game_id ? String(event.game_id) : (null as string | null),
      scenario_key: event?.scenario_id ? `id:${event.scenario_id}` : (null as string | null),
      min_players: event?.min_players ?? (null as number | null),
      max_players: event?.max_players ?? (null as number | null),
      player_ids: (event?.player_ids as string[] | null) ?? [],
    },
    validate: {
      room_id: (v) => (!v ? "La salle est requise" : null),
      game_id: (v) => (!v ? "Le jeu est requis" : null),
      max_players: (v, values) =>
        v && values.min_players && v < values.min_players ? "Doit être ≥ au minimum" : null,
    },
  });

  const roomId = form.values.room_id ? Number(form.values.room_id) : null;
  const dateStr = format(editStart, "yyyy-MM-dd");
  const endDateStr = format(editEnd, "yyyy-MM-dd");

  const { data: rawSlots, isLoading: isLoadingSlots } = useRoomFreeSlots(
    roomId ?? 0,
    { date: dateStr, end_date: endDateStr, event_id: event?.id ?? null },
    { query: { enabled: roomId !== null } },
  );
  const freeSlots = rawSlots as FreeSlot[] | undefined;

  // A slot is "active" if it fully contains the current interval
  const isSlotActive = (slot: FreeSlot) =>
    new Date(slot.start) <= editStart && new Date(slot.end) >= editEnd;

  const intervalValid = !freeSlots || freeSlots.some(isSlotActive);

  const noSlotsAtAll = freeSlots !== undefined && freeSlots.length === 0;

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getEventsIndexQueryKey() });
    queryClient.invalidateQueries({ queryKey: getDictionaryQueryKey() });
    if (event) {
      queryClient.invalidateQueries({ queryKey: getEventsShowQueryKey(event.id) });
    }
    onClose();
  };

  const store = useEventsStore({ mutation: { onSuccess } });
  const update = useEventsUpdate({ mutation: { onSuccess } });

  const isPending = store.isPending || update.isPending;

  const handleGameChange = (value: string | null) => {
    form.setFieldValue("game_id", value);
    form.setFieldValue("scenario_key", null);
  };

  const handleDateChange = (newStart: Date, newEnd: Date) => {
    setEditStart(newStart);
    setEditEnd(newEnd);
  };

  const handleSlotClick = (slot: FreeSlot) => {
    setEditStart(new Date(slot.start));
    setEditEnd(new Date(slot.end));
  };

  const formatSlot = (slot: FreeSlot) => {
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    const dayStart = format(s, "EEE", { locale: fr });
    const endPrefix = isSameDay(s, e) ? "" : `${format(e, "EEE", { locale: fr })} `;
    return `${dayStart} ${format(s, "HH'h'mm")} → ${endPrefix}${format(e, "HH'h'mm")}`;
  };

  const handleSubmit = form.onSubmit((values) => {
    const payload = {
      datetime_start: editStart.toISOString(),
      datetime_end: editEnd.toISOString(),
      mj_discord_id: mjDiscordId!,
      room_id: Number(values.room_id),
      game_id: Number(values.game_id),
      scenario_key: values.scenario_key,
      min_players: values.min_players ?? null,
      max_players: values.max_players ?? null,
      player_ids: values.player_ids.length > 0 ? values.player_ids : null,
    };

    if (event) {
      update.mutate({ event: event.id, data: payload });
    } else {
      store.mutate({ data: payload });
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack mt="sm">
        <Select
          label="Salle"
          placeholder="Choisir une salle"
          required
          data={rooms.map((r) => ({ value: String(r.id), label: r.name ?? r.code }))}
          {...form.getInputProps("room_id")}
        />

        <EventDateRangePicker
          start={editStart}
          end={editEnd}
          onChange={handleDateChange}
          error={roomId && !intervalValid ? "Horaire non disponible pour cette salle" : undefined}
        />

        {roomId && (
          <Stack gap={6}>
            {isLoadingSlots ? (
              <Loader size="xs" />
            ) : noSlotsAtAll ? (
              <Text size="xs" c="red">
                Aucun créneau disponible pour cette salle ce jour-là.
              </Text>
            ) : freeSlots && freeSlots.length > 0 ? (
              <Group gap="xs">
                {freeSlots.map((slot) => (
                  <Badge
                    key={slot.start}
                    variant={isSlotActive(slot) ? "filled" : "outline"}
                    color="neon"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSlotClick(slot)}
                  >
                    {formatSlot(slot)}
                  </Badge>
                ))}
              </Group>
            ) : null}
          </Stack>
        )}

        <Select
          label="Jeu"
          placeholder="Choisir un jeu"
          required
          searchable
          data={games.map((g) => ({ value: String(g.id), label: g.name }))}
          value={form.values.game_id}
          onChange={handleGameChange}
          error={form.errors.game_id}
        />

        <ScenarioSelect
          gameId={form.values.game_id}
          value={form.values.scenario_key}
          onChange={(s) => form.setFieldValue("scenario_key", s?.key ?? null)}
        />

        <NumberInput
          label="Joueurs min"
          placeholder="1"
          min={1}
          {...form.getInputProps("min_players")}
        />

        <NumberInput
          label="Joueurs max"
          placeholder="6"
          min={1}
          {...form.getInputProps("max_players")}
        />

        <MembersSelect
          label="Joueurs"
          members={members}
          value={form.values.player_ids}
          onChange={(ids) => form.setFieldValue("player_ids", ids)}
          maxValues={form.values.max_players ?? undefined}
        />

        <Button type="submit" loading={isPending}>
          {event ? "Modifier" : "Créer"}
        </Button>
      </Stack>
    </form>
  );
}
