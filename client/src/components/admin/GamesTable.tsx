import { useMemo, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { MRT_ColumnDef } from "mantine-react-table";
import {
  getGamesIndexQueryKey,
  useGamesDestroy,
  useGamesIndex,
} from "../../api/generated/game/game";
import type { Game } from "../../api/generated/model";
import { AdminTable, type DeleteState } from "./AdminTable";
import { GamesFormModal } from "./GamesFormModal";

export function GamesTable() {
  const queryClient = useQueryClient();
  const { data: games = [], isLoading } = useGamesIndex();

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingGame, setEditingGame] = useState<Game | undefined>(undefined);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  const destroy = useGamesDestroy({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGamesIndexQueryKey() });
        setDeleteState(null);
      },
      onError: (error) => {
        const message =
          (error as unknown as { message?: string })?.message ??
          "Une erreur est survenue lors de la suppression.";
        setDeleteState((prev) => (prev ? { ...prev, error: message } : null));
      },
    },
  });

  const columns = useMemo<MRT_ColumnDef<Game>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nom",
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditingGame(undefined);
    openModal();
  };

  const openEdit = (game: Game) => {
    setEditingGame(game);
    openModal();
  };

  const handleDelete = (game: Game) => {
    setDeleteState({ id: game.id, error: null });
    destroy.mutate({ game: game.id });
  };

  return (
    <>
      <AdminTable
        title="Jeux"
        columns={columns}
        data={games}
        isLoading={isLoading}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
        deleteState={deleteState}
        deleteConfirmMessage="Supprimer ce jeu ?"
        initialSortId="name"
        width={400}
      />

      <GamesFormModal
        opened={modalOpened}
        onClose={closeModal}
        game={editingGame}
      />
    </>
  );
}
