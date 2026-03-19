import { Avatar, Group, Text } from "@mantine/core";
import type { DiscordMember } from "../contexts/DictionaryContext";

interface Props {
  member: DiscordMember;
  size?: "sm" | "md";
}

export function MemberAvatar({ member, size = "sm" }: Props) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar src={member.avatar} size={size === "sm" ? 24 : 32} radius="xl">
        {member.username[0].toUpperCase()}
      </Avatar>
      <Text size={size === "sm" ? "sm" : "md"} style={{ whiteSpace: "nowrap" }}>
        {member.username}
      </Text>
    </Group>
  );
}
