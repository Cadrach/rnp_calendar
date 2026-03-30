import { Group, Text } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import "@mantine/dates/styles.css";

interface Props {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
  error?: string;
}

export function EventDateRangePicker({ start, end, onChange, error }: Props) {
  const handleStartChange = (value: string | null) => {
    if (!value) return;
    const newStart = new Date(value);
    const duration = end.getTime() - start.getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    onChange(newStart, newEnd);
  };

  const handleEndChange = (value: string | null) => {
    if (!value) return;
    const newEnd = new Date(value);
    if (newEnd <= start) return;
    onChange(start, newEnd);
  };

  return (
    <div>
      <Group grow align="flex-start">
        <DateTimePicker
          label="Début"
          required
          value={start}
          onChange={handleStartChange}
          valueFormat="DD/MM/YYYY HH:mm"
          firstDayOfWeek={1}
          dropdownType="modal"
        />
        <DateTimePicker
          label="Fin"
          required
          value={end}
          onChange={handleEndChange}
          minDate={start}
          valueFormat="DD/MM/YYYY HH:mm"
          firstDayOfWeek={1}
          dropdownType="modal"
        />
      </Group>
      {error && (
        <Text size="xs" c="red" mt={4}>{error}</Text>
      )}
    </div>
  );
}
