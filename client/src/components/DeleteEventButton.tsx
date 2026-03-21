import { ActionIcon, Popover, Button, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEventsDestroy } from "../api/generated/event/event";
import { getEventsIndexQueryKey } from "../api/generated/event/event";

interface Props {
  eventId: number;
}

export function DeleteEventButton({ eventId }: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isPending } = useEventsDestroy({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getEventsIndexQueryKey() });
        navigate("/");
      },
    },
  });

  return (
    <Popover opened={opened} onClose={close} position="top" withArrow>
      <Popover.Target>
        <ActionIcon
          variant="filled"
          color="red"
          size="lg"
          onClick={open}
          aria-label="Supprimer l'événement"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" mb="sm">
          Supprimer cet événement ?
        </Text>
        <Group gap="xs" justify="flex-end">
          <Button size="xs" variant="default" onClick={close}>
            Annuler
          </Button>
          <Button
            size="xs"
            color="red"
            loading={isPending}
            onClick={() => mutate({ event: eventId })}
          >
            Supprimer
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
