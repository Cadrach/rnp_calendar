import { Group, Select, Switch } from "@mantine/core";
import { useDictionary } from "../contexts/DictionaryContext";

export interface CalendarFilters {
  roomId: number | null;
  myCalendar: boolean;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  roomId: null,
  myCalendar: false,
};

interface CalendarFilterProps {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
}

export function CalendarFilter({ filters, onChange }: CalendarFilterProps) {
  const { rooms } = useDictionary();

  return (
    <Group px="md" py="xs" gap="sm">
      <Select
        placeholder="Toutes les salles"
        clearable
        data={rooms.map((r) => ({ value: String(r.id), label: r.name ?? r.code }))}
        value={filters.roomId !== null ? String(filters.roomId) : null}
        onChange={(val) => onChange({ ...filters, roomId: val ? Number(val) : null })}
      />
      <Switch
        label="Mon calendrier"
        checked={filters.myCalendar}
        onChange={(e) => onChange({ ...filters, myCalendar: e.currentTarget.checked })}
      />
    </Group>
  );
}
