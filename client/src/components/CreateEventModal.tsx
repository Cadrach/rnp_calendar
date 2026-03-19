import { Stack, Text } from "@mantine/core";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";

interface Props {
  start: Date;
  end: Date;
}

export function CreateEventModal({ start, end }: Props) {
  const fmt = (d: Date) => format(d, "PPPp", { locale: fr });

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Du {fmt(start)} au {fmt(end)}
      </Text>
    </Stack>
  );
}
