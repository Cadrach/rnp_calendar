import { useEffect, useState } from "react";
import { Button, Loader, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import type { Event } from "../api/generated/model";
import { getDictionaryQueryKey } from "../api/generated/dictionary/dictionary";
import {
  getEventsIndexQueryKey,
  getEventsShowQueryKey,
  useEventsStore,
  useEventsUpdate,
} from "../api/generated/event/event";
import { useAvailableRooms } from "../api/rooms";
import { useDictionary } from "../contexts/DictionaryContext";
import { EventDateRangePicker } from "./EventDateRangePicker";
import { MembersSelect } from "./MembersSelect";
import { ScenarioSelect } from "./ScenarioSelect";

interface Props {
  start: Date;
  end: Date;
  onClose: () => void;
  event?: Event;
  initialRoomId?: number | null;
}

export function CreateEventModal({ start, end, onClose, event, initialRoomId }: Props) {
  const { user, games, members } = useDictionary();
  const queryClient = useQueryClient();

  const mjUserId = event ? event.mj_user_id : user.id;

  // In edit mode, start/end are editable — track them in local state so the
  // available-rooms query reacts immediately when either date changes.
  const [editStart, setEditStart] = useState(start);
  const [editEnd, setEditEnd] = useState(end);

  const { data: availableRooms, isLoading: isLoadingRooms } = useAvailableRooms(
    event ? editStart : start,
    event ? editEnd : end,
    event?.id,
  );

  const form = useForm({
    initialValues: {
      room_id: event?.room_id ? String(event.room_id) : initialRoomId ? String(initialRoomId) : (null as string | null),
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

  // When available rooms refresh after a date change, clear the selected room
  // if it is no longer in the list.
  useEffect(() => {
    if (!availableRooms || !form.values.room_id) return;
    const stillAvailable = availableRooms.some((r) => String(r.id) === form.values.room_id);
    if (!stillAvailable) {
      form.setFieldValue("room_id", null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRooms]);

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

  const handleSubmit = form.onSubmit((values) => {
    const payload = {
      datetime_start: (event ? editStart : start).toISOString(),
      datetime_end: (event ? editEnd : end).toISOString(),
      mj_user_id: mjUserId,
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
      <Stack>
        {event ? (
          <EventDateRangePicker
            start={editStart}
            end={editEnd}
            onChange={handleDateChange}
          />
        ) : (
          <Text size="sm" c="dimmed">
            {format(start, "PPPp", { locale: fr })} → {format(end, "PPPp", { locale: fr })}
          </Text>
        )}

        <Select
          label="Salle"
          placeholder="Choisir une salle"
          required
          data={(availableRooms ?? []).map((r) => ({ value: String(r.id), label: r.name }))}
          disabled={isLoadingRooms}
          rightSection={isLoadingRooms ? <Loader size="xs" /> : undefined}
          {...form.getInputProps("room_id")}
        />

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
