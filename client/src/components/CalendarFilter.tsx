import { useMemo, useState, type MutableRefObject } from "react";
import {
  Box,
  Button,
  Indicator,
  Popover,
  RangeSlider,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
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

export function useActiveFilterCount(filters: CalendarFilters): number {
  return useMemo(() => {
    let count = 0;
    if (filters.roomId !== null) count++;
    if (filters.gameId !== null) count++;
    if (filters.mjId !== null) count++;
    if (filters.myCalendar) count++;
    if (filters.availableSlots !== null) count++;
    return count;
  }, [filters]);
}

interface FilterDropdownProps {
  filtersRef: MutableRefObject<CalendarFilters>;
  onChange: (filters: CalendarFilters) => void;
}

export function FilterDropdown({ filtersRef, onChange }: FilterDropdownProps) {
  const [opened, setOpened] = useState(false);
  // Local state for reactivity, initialized from ref
  const [filters, setFilters] = useState(filtersRef.current);
  const { rooms, games, members } = useDictionary();
  const mjMembers = useMemo(() => members.filter((m) => m.is_mj), [members]);
  const activeCount = useActiveFilterCount(filters);

  const handleChange = (newFilters: CalendarFilters) => {
    setFilters(newFilters);
    onChange(newFilters);
  };

  return (
    <Popover width={300} position="bottom-start" shadow="md" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Indicator
          label={activeCount}
          size={18}
          disabled={activeCount === 0}
          color="cyan"
          offset={4}
        >
          <Button
            variant="default"
            leftSection={<IconFilter size={18} />}
            onClick={() => setOpened((o) => !o)}
          >
            Filtrer
          </Button>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="md">
          <Select
            label="Salle"
            placeholder="Toutes les salles"
            clearable
            data={rooms.map((r) => ({ value: String(r.id), label: r.name ?? r.code }))}
            value={filters.roomId !== null ? String(filters.roomId) : null}
            onChange={(val) => handleChange({ ...filters, roomId: val ? Number(val) : null })}
          />
          <Select
            label="Jeu"
            placeholder="Tous les jeux"
            clearable
            searchable
            data={games.map((g) => ({ value: String(g.id), label: g.name }))}
            value={filters.gameId !== null ? String(filters.gameId) : null}
            onChange={(val) => handleChange({ ...filters, gameId: val ? Number(val) : null })}
          />
          <Select
            label="MJ"
            placeholder="Tous les MJ"
            clearable
            searchable
            data={mjMembers.map((m) => ({ value: m.id, label: m.username }))}
            value={filters.mjId}
            onChange={(val) => handleChange({ ...filters, mjId: val })}
          />
          <Box onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <Text size="sm">Places disponibles</Text>
            <RangeSlider
              min={0}
              max={4}
              step={1}
              minRange={0}
              marks={SLOT_MARKS}
              value={filters.availableSlots ?? [0, 4]}
              onChange={(val) => handleChange({ ...filters, availableSlots: val })}
              onChangeEnd={(val) => {
                if (val[0] === 0 && val[1] === 4) {
                  handleChange({ ...filters, availableSlots: null });
                }
              }}
            />
          </Box>
          <Box mt="md">
            <Switch
              size="md"
              label="Mon calendrier"
              checked={filters.myCalendar}
              onChange={(e) => handleChange({ ...filters, myCalendar: e.currentTarget.checked })}
            />
          </Box>
          {activeCount > 0 && (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => handleChange(DEFAULT_FILTERS)}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
