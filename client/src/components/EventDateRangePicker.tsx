import { Group } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import "@mantine/dates/styles.css";

interface Props {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
}

export function EventDateRangePicker({ start, end, onChange }: Props) {
  const handleStartChange = (value: string | null) => {
    if (!value) return;
    const newStart = new Date(value);
    const newEnd = newStart >= end ? new Date(newStart.getTime() + 60 * 60 * 1000) : end;
    onChange(newStart, newEnd);
  };

  const handleEndChange = (value: string | null) => {
    if (!value) return;
    const newEnd = new Date(value);
    if (newEnd <= start) return;
    onChange(start, newEnd);
  };

  return (
    <Group grow align="flex-start">
      <DateTimePicker
        label="Début"
        required
        value={start}
        onChange={handleStartChange}
        valueFormat="DD/MM/YYYY HH:mm"
        firstDayOfWeek={1}
      />
      <DateTimePicker
        label="Fin"
        required
        value={end}
        onChange={handleEndChange}
        minDate={start}
        valueFormat="DD/MM/YYYY HH:mm"
        firstDayOfWeek={1}
      />
    </Group>
  );
}
