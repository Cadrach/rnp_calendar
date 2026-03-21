import { Avatar, Group, Text } from "@mantine/core";
import type { DiscordMember } from "../contexts/DictionaryContext";

interface Props {
  member: DiscordMember;
  size?: "sm" | "md";
}

export function MemberAvatar({ member, size = "sm" }: Props) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar
        src={member.avatar}
        size={size === "sm" ? 24 : 32}
        radius="xl"
        bd="2px solid rgba(0, 212, 232, 0.35)"
        style={{ boxShadow: "0 0 6px rgba(0, 212, 232, 0.3)" }}
      >
        {member.username[0].toUpperCase()}
      </Avatar>
      <Text size={size === "sm" ? "sm" : "md"} inherit style={{ whiteSpace: "nowrap" }}>
        {member.username}
      </Text>
    </Group>
  );
}
