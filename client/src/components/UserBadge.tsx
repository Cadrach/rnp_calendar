import { Badge, Group } from "@mantine/core";
import { useDictionary } from "../contexts/DictionaryContext";
import { MemberAvatar } from "./MemberAvatar";

export function UserBadge() {
  const { user, members } = useDictionary();
  const member = members.find((m) => m.id === user.discord_id);

  return (
    <Group gap="xs">
      {member && <MemberAvatar member={member} />}
      {user.is_mj && (
        <Badge variant="light" color="violet">
          MJ
        </Badge>
      )}
      {user.is_admin && (
        <Badge variant="light" color="red">
          ADM
        </Badge>
      )}
    </Group>
  );
}
