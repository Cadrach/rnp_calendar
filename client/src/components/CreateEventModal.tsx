import { Button, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import type { Event } from "../api/generated/model";
import {
  getEventsIndexQueryKey,
  getEventsShowQueryKey,
  useEventsStore,
  useEventsUpdate,
} from "../api/generated/event/event";
import { useDictionary } from "../contexts/DictionaryContext";
import { MembersSelect } from "./MembersSelect";

interface Props {
  start: Date;
  end: Date;
  onClose: () => void;
  event?: Event;
}

export function CreateEventModal({ start, end, onClose, event }: Props) {
  const { user, games, rooms, scenarios, members } = useDictionary();
  const queryClient = useQueryClient();

  const mjUserId = event ? event.mj_user_id : user.id;

  const form = useForm({
    initialValues: {
      room_id: event?.room_id ? String(event.room_id) : (null as string | null),
      game_id: event?.game_id ? String(event.game_id) : (null as string | null),
      scenario_id: event?.scenario_id ? String(event.scenario_id) : (null as string | null),
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

  const filteredScenarios = scenarios.filter(
    (s) => s.mj_user_id === mjUserId && String(s.game_id) === form.values.game_id,
  );

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getEventsIndexQueryKey() });
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
    form.setFieldValue("scenario_id", null);
  };

  const handleSubmit = form.onSubmit((values) => {
    const payload = {
      datetime_start: start.toISOString(),
      datetime_end: end.toISOString(),
      mj_user_id: mjUserId,
      room_id: Number(values.room_id),
      game_id: Number(values.game_id),
      scenario_id: values.scenario_id ? Number(values.scenario_id) : null,
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
        <Text size="sm" c="dimmed">
          {format(start, "PPPp", { locale: fr })} → {format(end, "PPPp", { locale: fr })}
        </Text>

        <Select
          label="Salle"
          placeholder="Choisir une salle"
          required
          data={rooms.map((r) => ({ value: String(r.id), label: r.name }))}
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

        <Select
          label="Scénario"
          placeholder={form.values.game_id ? "Choisir un scénario" : "Sélectionner un jeu d'abord"}
          disabled={!form.values.game_id}
          clearable
          data={filteredScenarios.map((s) => ({ value: String(s.id), label: s.name }))}
          {...form.getInputProps("scenario_id")}
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
