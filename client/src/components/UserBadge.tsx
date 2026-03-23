import { Badge, Group } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useDictionary } from "../contexts/DictionaryContext";
import { MemberAvatar } from "./MemberAvatar";

export function UserBadge() {
  const { user, members } = useDictionary();
  const member = members.find((m) => m.id === user.discord_id);
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Group gap="xs">
      {member && <MemberAvatar member={member} hideName={isMobile} />}
      {user.is_mj && (
        <Badge
          variant="filled"
          color="neon"
          style={{ boxShadow: "0 0 6px #00d4e8, 0 0 16px rgba(0,212,232,0.7), 0 0 32px rgba(0,212,232,0.4)" }}
        >
          MJ
        </Badge>
      )}
      {user.is_admin && (
        <Badge
          variant="filled"
          color="red"
          style={{ boxShadow: "0 0 6px #ff5050, 0 0 16px rgba(255,80,80,0.7), 0 0 32px rgba(255,80,80,0.4)" }}
        >
          ADM
        </Badge>
      )}
    </Group>
  );
}
