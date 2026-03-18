import { Avatar, Group, Skeleton, Text } from "@mantine/core";
import { useGetUser } from "../api/generated/default/default";

export function UserBadge() {
  const { data: user, isLoading } = useGetUser();

  if (isLoading) {
    return <Skeleton height={32} width={120} radius="xl" />;
  }

  if (!user) {
    return null;
  }

  return (
    <Group gap="xs">
      <Avatar radius="xl" size="sm" color="blue">
        {user.name.charAt(0).toUpperCase()}
      </Avatar>
      <Text size="sm" fw={500}>
        {user.name}
      </Text>
    </Group>
  );
}
