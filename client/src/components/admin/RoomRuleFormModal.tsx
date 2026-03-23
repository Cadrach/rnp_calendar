import { useEffect } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRoomRulesIndexQueryKey,
  useRoomRulesStore,
  useRoomRulesUpdate,
} from "../../api/generated/room-rule/room-rule";
import type { RoomRule } from "../../api/generated/model";
import { useDictionary } from "../../contexts/DictionaryContext";

const WEEKDAYS = [
  { value: "1", label: "Lun" },
  { value: "2", label: "Mar" },
  { value: "3", label: "Mer" },
  { value: "4", label: "Jeu" },
  { value: "5", label: "Ven" },
  { value: "6", label: "Sam" },
  { value: "7", label: "Dim" },
];

interface Props {
  opened: boolean;
  onClose: () => void;
  rule?: RoomRule;
}

function valuesFromRule(rule?: RoomRule) {
  return {
    room_id: rule?.room_id ? String(rule.room_id) : (null as string | null),
    kind: rule?.kind ?? "available",
    scope: rule?.scope ?? "daily",
    date: rule?.date?.slice(0, 10) ?? "",
    weekdays: ((rule?.weekdays as number[] | null) ?? []).map(String),
    start_time: rule?.start_time?.slice(0, 5) ?? "",
    end_time: rule?.end_time?.slice(0, 5) ?? "",
    valid_from: rule?.valid_from?.slice(0, 10) ?? "",
    valid_until: rule?.valid_until?.slice(0, 10) ?? "",
    priority: rule?.priority ?? 0,
    reason: rule?.reason ?? "",
  };
}

export function RoomRuleFormModal({ opened, onClose, rule }: Props) {
  const { rooms } = useDictionary();
  const queryClient = useQueryClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getRoomRulesIndexQueryKey() });
    onClose();
  };

  const store = useRoomRulesStore({ mutation: { onSuccess } });
  const update = useRoomRulesUpdate({ mutation: { onSuccess } });
  const isPending = store.isPending || update.isPending;

  const form = useForm({
    initialValues: valuesFromRule(rule),
    validate: {
      room_id: (v) => (!v ? "La salle est requise" : null),
      start_time: (v) => (!v ? "Requis" : null),
      end_time: (v, values) => {
        if (!v) return "Requis";
        if (v <= values.start_time) return "Doit être après l'heure de début";
        return null;
      },
      date: (v, values) =>
        values.scope === "once" && !v ? "Requis pour une date ponctuelle" : null,
      weekdays: (v, values) =>
        values.scope === "weekly" && v.length === 0 ? "Sélectionner au moins un jour" : null,
    },
  });

  useEffect(() => {
    form.setValues(valuesFromRule(rule));
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule, opened]);

  const handleSubmit = form.onSubmit((values) => {
    const payload = {
      room_id: Number(values.room_id),
      kind: values.kind as "available" | "unavailable",
      scope: values.scope as "daily" | "weekly" | "once",
      date: values.scope === "once" ? values.date : null,
      weekdays: values.scope === "weekly" ? values.weekdays.map(Number) : null,
      start_time: values.start_time,
      end_time: values.end_time,
      valid_from: values.valid_from || null,
      valid_until: values.valid_until || null,
      priority: values.priority,
      reason: values.reason || null,
    };

    if (rule) {
      update.mutate({ roomRule: rule.id, data: payload });
    } else {
      store.mutate({ data: payload });
    }
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={rule ? "Modifier la règle" : "Nouvelle règle"}
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <Select
            label="Salle"
            required
            data={rooms
              .filter((r) => !r.unlimited)
              .map((r) => ({ value: String(r.id), label: r.name ?? r.code }))}
            {...form.getInputProps("room_id")}
          />

          <Select
            label="Type"
            required
            data={[
              { value: "available", label: "Disponible" },
              { value: "unavailable", label: "Indisponible" },
            ]}
            {...form.getInputProps("kind")}
          />

          <Select
            label="Récurrence"
            required
            data={[
              { value: "daily", label: "Tous les jours" },
              { value: "weekly", label: "Hebdomadaire" },
              { value: "once", label: "Ponctuel" },
            ]}
            {...form.getInputProps("scope")}
          />

          {form.values.scope === "weekly" && (
            <Checkbox.Group label="Jours" {...form.getInputProps("weekdays")}>
              <Group mt="xs" gap="xs">
                {WEEKDAYS.map((d) => (
                  <Checkbox key={d.value} value={d.value} label={d.label} />
                ))}
              </Group>
            </Checkbox.Group>
          )}

          {form.values.scope === "once" && (
            <TextInput
              label="Date"
              type="date"
              required
              {...form.getInputProps("date")}
            />
          )}

          <Group grow>
            <TimeInput label="Début" required {...form.getInputProps("start_time")} />
            <TimeInput label="Fin" required {...form.getInputProps("end_time")} />
          </Group>

          <Group grow>
            <TextInput label="Valide du" type="date" {...form.getInputProps("valid_from")} />
            <TextInput label="au" type="date" {...form.getInputProps("valid_until")} />
          </Group>

          <NumberInput label="Priorité" min={0} {...form.getInputProps("priority")} />

          <TextInput label="Raison" placeholder="Optionnel" {...form.getInputProps("reason")} />

          <Button type="submit" loading={isPending}>
            {rule ? "Modifier" : "Créer"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
