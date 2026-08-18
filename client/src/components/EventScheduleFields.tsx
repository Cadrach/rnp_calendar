import { Group, Stack, Text } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { addDuration, MIN_EVENT_DURATION } from "../utils/duration";
import { DurationPicker } from "./DurationPicker";

interface Props {
  start: Date;
  duration: string;
  onStartChange: (start: Date) => void;
  onDurationChange: (duration: string) => void;
  onDurationInvalidChange: (invalid: boolean) => void;
  error?: string;
}

export function EventScheduleFields({
  start,
  duration,
  onStartChange,
  onDurationChange,
  onDurationInvalidChange,
  error,
}: Props) {
  const end = addDuration(start, duration);

  return (
    <Stack gap={4}>
      <Group grow align="flex-start">
        <DateTimePicker
          label="Début"
          required
          value={start}
          onChange={(value) => value && onStartChange(new Date(value))}
          valueFormat="DD/MM/YYYY HH:mm"
          firstDayOfWeek={1}
          dropdownType="modal"
        />
        <DurationPicker
          required
          value={duration}
          onChange={onDurationChange}
          onInvalidChange={onDurationInvalidChange}
          min={MIN_EVENT_DURATION}
        />
      </Group>

      <Text size="xs" c="dimmed">
        Fin :{" "}
        {isSameDay(start, end)
          ? format(end, "HH'h'mm")
          : format(end, "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
      </Text>

      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
