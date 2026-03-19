import { Avatar, Badge, Group, Text } from "@mantine/core";
import { useDictionary } from "../contexts/DictionaryContext";

export function UserBadge() {
  const { user } = useDictionary();

  return (
    <Group gap="xs">
      <Avatar radius="xl" size="sm" color="blue">
        {user.name.charAt(0).toUpperCase()}
      </Avatar>
      <Text size="sm" fw={500}>
        {user.name}
      </Text>
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
