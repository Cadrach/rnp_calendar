import { useMemo } from "react";
import { ColorSwatch, Group, Skeleton, Stack, Table, Text, UnstyledButton } from "@mantine/core";
import { useQueries } from "@tanstack/react-query";
import { addDays, eachDayOfInterval, format, isToday, startOfDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { getRoomFreeSlotsQueryOptions } from "../api/generated/room/room";
import { useDictionary } from "../contexts/DictionaryContext";

interface FreeSlot {
  start: string;
  end: string;
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
 * Free slots are returned for the whole week at once, and the resolver merges adjacent intervals —
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

  // Unlimited rooms are always free, so a grid row for them carries no information.
  const limitedRooms = useMemo(() => rooms.filter((r) => !r.unlimited), [rooms]);

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  // One request per room covers the whole week (free-slots takes an inclusive end_date).
  const results = useQueries({
    queries: limitedRooms.map((room) =>
      getRoomFreeSlotsQueryOptions(
        room.id,
        {
          date: format(weekStart, "yyyy-MM-dd"),
          end_date: format(weekEnd, "yyyy-MM-dd"),
        },
        { query: { staleTime: 5 * 60 * 1000 } },
      ),
    ),
  });

  if (limitedRooms.length === 0) {
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
          {limitedRooms.map((room, index) => {
            const { data, isPending, isError } = results[index];
            const slots = (data as FreeSlot[] | undefined) ?? [];

            return (
              <Table.Tr key={room.id}>
                <Table.Td className="availability-room-col">
                  <Group gap="xs" wrap="nowrap">
                    <ColorSwatch color={room.color} size={12} />
                    <Text size="sm" fw={500}>
                      {room.name ?? room.code}
                    </Text>
                  </Group>
                </Table.Td>

                {days.map((day) => {
                  if (isPending) {
                    return (
                      <Table.Td key={day.toISOString()}>
                        <Skeleton height={22} radius="sm" />
                      </Table.Td>
                    );
                  }

                  if (isError) {
                    return (
                      <Table.Td key={day.toISOString()}>
                        <Text size="xs" c="red.4">
                          Erreur
                        </Text>
                      </Table.Td>
                    );
                  }

                  const intervals = clipToDay(slots, day);

                  return (
                    <Table.Td key={day.toISOString()}>
                      {intervals.length === 0 ? (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      ) : (
                        <Stack gap={4}>
                          {intervals.map((interval) => (
                            <UnstyledButton
                              key={interval.start.toISOString()}
                              className="availability-slot"
                              onClick={() => onSlotClick(interval.start, interval.end, room.id)}
                              title={`Créer une séance — ${room.name ?? room.code}`}
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
        </Table.Tbody>
      </Table>
    </div>
  );
}
