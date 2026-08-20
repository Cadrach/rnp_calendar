import { useMemo } from "react";
import { ColorSwatch, Group, Loader, Stack, Table, Text, UnstyledButton } from "@mantine/core";
import { addDays, eachDayOfInterval, format, isToday, startOfDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { useEventFreeSlots } from "../api/generated/event/event";
import { useDictionary } from "../contexts/DictionaryContext";

interface FreeSlot {
  start: string;
  end: string;
}

/** One entry per bookable (non-unlimited) room, ordered by name; `slots` is empty when fully booked. */
interface RoomFreeSlots {
  room_id: number;
  slots: FreeSlot[];
}

interface Interval {
  start: Date;
  end: Date;
}

interface Props {
  weekStart: Date;
  weekEnd: Date;
  onSlotClick: (start: Date, end: Date, roomId: number) => void;
}

/**
 * Free slots come back for the whole week at once, and the resolver merges adjacent intervals —
 * so a slot can straddle midnight. Clipping each slot to the day (upper bound exclusive, i.e. next
 * midnight) is what makes a day-per-column grid correct in every case.
 */
function clipToDay(slots: FreeSlot[], day: Date): Interval[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const result: Interval[] = [];

  for (const slot of slots) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const from = start > dayStart ? start : dayStart;
    const to = end < dayEnd ? end : dayEnd;
    if (to.getTime() > from.getTime()) result.push({ start: from, end: to });
  }

  return result;
}

const slotLabel = (interval: Interval) =>
  `${format(interval.start, "HH'h'mm")} – ${format(interval.end, "HH'h'mm")}`;

export function AvailabilityView({ weekStart, weekEnd, onSlotClick }: Props) {
  const { rooms } = useDictionary();

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  // One request covers every bookable room for the whole week.
  const { data, isPending, isError } = useEventFreeSlots(
    {
      date: format(weekStart, "yyyy-MM-dd"),
      end_date: format(weekEnd, "yyyy-MM-dd"),
    },
    { query: { staleTime: 5 * 60 * 1000 } },
  );

  // The endpoint decides which rooms are bookable and in what order; the dictionary only supplies
  // their display attributes.
  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const rows = (data as RoomFreeSlots[] | undefined) ?? [];

  if (isPending) {
    return (
      <Group justify="center" py="xl">
        <Loader color="cyan" />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text c="red.4" ta="center" py="xl">
        Les disponibilités n'ont pas pu être chargées.
      </Text>
    );
  }

  if (rows.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Aucune salle à disponibilité limitée.
      </Text>
    );
  }

  return (
    <div className="availability-view">
      <Table className="availability-table" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="availability-room-col">Salle</Table.Th>
            {days.map((day) => (
              <Table.Th
                key={day.toISOString()}
                className={isToday(day) ? "availability-today" : undefined}
              >
                {format(day, "EEE d MMM", { locale: fr })}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {rows.map((row) => {
            const room = roomsById.get(row.room_id);

            return (
              <Table.Tr key={row.room_id}>
                <Table.Td className="availability-room-col">
                  <Group gap="xs" wrap="nowrap">
                    {room && <ColorSwatch color={room.color} size={12} />}
                    <Text className="availability-room-name" size="sm" fw={500}>
                      {room?.name ?? room?.code ?? `Salle #${row.room_id}`}
                    </Text>
                  </Group>
                </Table.Td>

                {days.map((day) => {
                  const intervals = clipToDay(row.slots, day);

                  return (
                    <Table.Td key={day.toISOString()}>
                      {intervals.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center">
                          —
                        </Text>
                      ) : (
                        <Stack gap={4}>
                          {intervals.map((interval) => (
                            <UnstyledButton
                              key={interval.start.toISOString()}
                              className="availability-slot"
                              onClick={() => onSlotClick(interval.start, interval.end, row.room_id)}
                              title={`Créer une séance — ${room?.name ?? room?.code ?? ""}`}
                            >
                              {slotLabel(interval)}
                            </UnstyledButton>
                          ))}
                        </Stack>
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}

          <Table.Tr className="availability-note-row">
            <Table.Td colSpan={days.length + 1}>
              Seules les salles limitées sont affichées, les salles sans limites sont toujours
              disponibles.
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>
  );
}
