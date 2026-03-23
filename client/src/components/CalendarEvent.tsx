import { Box, Group, Text, Tooltip } from "@mantine/core";
import { IconLockFilled } from "@tabler/icons-react";
import { MemberAvatar } from "./MemberAvatar";
import type { DiscordMember } from "../contexts/DictionaryContext";

interface Props {
  event: {
    gameName: string;
    roomName: string | null;
    textColor: string;
    mj: DiscordMember | undefined;
    isFull: boolean;
  };
}

export function CalendarEvent({ event }: Props) {
  return (
    <Box style={{ color: event.textColor }} px={2} py={1} lh={2}>
      <Group gap={4} wrap="nowrap">
        {event.isFull && (
          <Tooltip label="Evenement Complet">
            <IconLockFilled size={14} style={{ flexShrink: 0, opacity: 1 }} />
          </Tooltip>
        )}
        <Text size="xs" fw={600} truncate style={{ color: "inherit" }}>
          {event.gameName}
          {event.roomName && (
            <Text span size="xs" fw={400} style={{ color: "inherit", opacity: 0.8 }}>
              {" "}
              · {event.roomName}
            </Text>
          )}
        </Text>
      </Group>
      {event.mj && (
        <div style={{ opacity: 0.85 }}>
          <MemberAvatar member={event.mj} size="sm" />
        </div>
      )}
    </Box>
  );
}
