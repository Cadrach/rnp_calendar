import { useEffect } from "react";
import { Button, Checkbox, ColorInput, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRoomsIndexQueryKey,
  useRoomsStore,
  useRoomsUpdate,
} from "../../api/generated/room-crud/room-crud";
import type { Room } from "../../api/generated/model";

interface Props {
  opened: boolean;
  onClose: () => void;
  room?: Room;
}

export function RoomsFormModal({ opened, onClose, room }: Props) {
  const queryClient = useQueryClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getRoomsIndexQueryKey() });
    onClose();
  };

  const store = useRoomsStore({ mutation: { onSuccess } });
  const update = useRoomsUpdate({ mutation: { onSuccess } });
  const isPending = store.isPending || update.isPending;

  const form = useForm({
    initialValues: {
      code: room?.code ?? "",
      name: room?.name ?? "",
      url: room?.url ?? "",
      color: room?.color ?? "#3b82f6",
      unlimited: room?.unlimited ?? false,
    },
    validate: {
      code: (v) => (!v.trim() ? "Le code est requis" : null),
      name: (v) => (!v.trim() ? "Le nom est requis" : null),
      color: (v) => (!/^#[0-9a-fA-F]{6}$/.test(v) ? "Couleur hex invalide (#RRGGBB)" : null),
    },
  });

  useEffect(() => {
    form.setValues({
      code: room?.code ?? "",
      name: room?.name ?? "",
      url: room?.url ?? "",
      color: room?.color ?? "#3b82f6",
      unlimited: room?.unlimited ?? false,
    });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, opened]);

  const handleSubmit = form.onSubmit((values) => {
    const payload = {
      ...values,
      url: values.url || null,
    };

    if (room) {
      update.mutate({ room: room.id, data: payload });
    } else {
      store.mutate({ data: payload });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={room ? "Modifier la salle" : "Nouvelle salle"}>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput label="Code" required placeholder="CSb1" {...form.getInputProps("code")} />
          <TextInput label="Nom" required placeholder="Centre Social (Salle 1)" {...form.getInputProps("name")} />
          <TextInput label="URL" placeholder="https://…" {...form.getInputProps("url")} />
          <ColorInput label="Couleur" required format="hex" {...form.getInputProps("color")} />
          <Checkbox label="Illimitée (pas de vérification de disponibilité)" {...form.getInputProps("unlimited", { type: "checkbox" })} />
          <Button type="submit" loading={isPending}>
            {room ? "Modifier" : "Créer"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
