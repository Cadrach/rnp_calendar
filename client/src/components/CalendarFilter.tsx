import { Group, Select, Switch } from "@mantine/core";
import { useDictionary } from "../contexts/DictionaryContext";

export interface CalendarFilters {
  roomId: number | null;
  myCalendar: boolean;
  openGames: boolean;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  roomId: null,
  myCalendar: false,
  openGames: false,
};

interface CalendarFilterProps {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
}

export function CalendarFilter({ filters, onChange }: CalendarFilterProps) {
  const { rooms } = useDictionary();

  return (
    <Group px="md" py="xs" gap="lg" mt={64}>
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
      <Switch
        label="Places disponibles"
        checked={filters.openGames}
        onChange={(e) => onChange({ ...filters, openGames: e.currentTarget.checked })}
      />
    </Group>
  );
}
