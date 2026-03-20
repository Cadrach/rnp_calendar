import { Box, Text } from "@mantine/core";
import { MemberAvatar } from "./MemberAvatar";
import type { DiscordMember } from "../contexts/DictionaryContext";

interface Props {
  event: {
    gameName: string;
    roomName: string | null;
    textColor: string;
    mj: DiscordMember | undefined;
  };
}

export function CalendarEvent({ event }: Props) {
  return (
    <Box style={{ color: event.textColor }} px={2} py={1} lh={2}>
      <Text size="xs" fw={600} truncate style={{ color: "inherit" }}>
        {event.gameName}
        {event.roomName && (
          <Text span size="xs" fw={400} style={{ color: "inherit", opacity: 0.8 }}>
            {" "}
            · {event.roomName}
          </Text>
        )}
      </Text>
      {event.mj && (
        <div style={{ opacity: 0.85 }}>
          <MemberAvatar member={event.mj} size="sm" />
        </div>
      )}
    </Box>
  );
}
