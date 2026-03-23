import { useMemo } from "react";
import { Box, Group, RangeSlider, Select, Switch, Text } from "@mantine/core";
import { useDictionary } from "../contexts/DictionaryContext";

export interface CalendarFilters {
  roomId: number | null;
  gameId: number | null;
  mjId: string | null;
  myCalendar: boolean;
  availableSlots: [number, number] | null;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  roomId: null,
  gameId: null,
  mjId: null,
  myCalendar: false,
  availableSlots: null,
};

const SLOT_MARKS = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4+" },
];

interface CalendarFilterProps {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
}

export function CalendarFilter({ filters, onChange }: CalendarFilterProps) {
  const { rooms, games, members } = useDictionary();

  const mjMembers = useMemo(() => members.filter((m) => m.is_mj), [members]);

  return (
    <Group px="md" py="xs" gap="lg" align="flex-end">
      <Select
        placeholder="Toutes les salles"
        clearable
        data={rooms.map((r) => ({ value: String(r.id), label: r.name ?? r.code }))}
        value={filters.roomId !== null ? String(filters.roomId) : null}
        onChange={(val) => onChange({ ...filters, roomId: val ? Number(val) : null })}
      />
      <Select
        placeholder="Tous les jeux"
        clearable
        searchable
        data={games.map((g) => ({ value: String(g.id), label: g.name }))}
        value={filters.gameId !== null ? String(filters.gameId) : null}
        onChange={(val) => onChange({ ...filters, gameId: val ? Number(val) : null })}
      />
      <Select
        placeholder="Tous les MJ"
        clearable
        searchable
        data={mjMembers.map((m) => ({ value: m.id, label: m.username }))}
        value={filters.mjId}
        onChange={(val) => onChange({ ...filters, mjId: val })}
      />
      <Switch
        label="Mon calendrier"
        checked={filters.myCalendar}
        onChange={(e) => onChange({ ...filters, myCalendar: e.currentTarget.checked })}
      />
      <Box w={180}>
        <Text size="sm" mb={4}>
          Places
        </Text>
        <RangeSlider
          min={0}
          max={4}
          step={1}
          minRange={0}
          marks={SLOT_MARKS}
          value={filters.availableSlots ?? [0, 4]}
          onChange={(val) => onChange({ ...filters, availableSlots: val })}
          onChangeEnd={(val) => {
            if (val[0] === 0 && val[1] === 4) {
              onChange({ ...filters, availableSlots: null });
            }
          }}
        />
      </Box>
    </Group>
  );
}
