import { useEffect } from "react";
import { Button, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGamesIndexQueryKey,
  useGamesStore,
  useGamesUpdate,
} from "../../api/generated/game/game";
import type { Game } from "../../api/generated/model";

interface Props {
  opened: boolean;
  onClose: () => void;
  game?: Game;
}

export function GamesFormModal({ opened, onClose, game }: Props) {
  const queryClient = useQueryClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGamesIndexQueryKey() });
    onClose();
  };

  const store = useGamesStore({ mutation: { onSuccess } });
  const update = useGamesUpdate({ mutation: { onSuccess } });
  const isPending = store.isPending || update.isPending;

  const form = useForm({
    initialValues: { name: game?.name ?? "" },
    validate: {
      name: (v) => (!v.trim() ? "Le nom est requis" : null),
    },
  });

  useEffect(() => {
    form.setValues({ name: game?.name ?? "" });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, opened]);

  const handleSubmit = form.onSubmit(({ name }) => {
    if (game) {
      update.mutate({ game: game.id, data: { name } });
    } else {
      store.mutate({ data: { name } });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title={game ? "Modifier le jeu" : "Nouveau jeu"}>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput label="Nom" required {...form.getInputProps("name")} />
          <Button type="submit" loading={isPending}>
            {game ? "Modifier" : "Créer"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
