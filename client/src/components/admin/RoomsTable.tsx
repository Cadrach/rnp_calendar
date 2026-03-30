import { useMemo, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ColorSwatch, Group } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import type { MRT_ColumnDef } from "mantine-react-table";
import {
  getRoomsIndexQueryKey,
  useRoomsDestroy,
  useRoomsIndex,
} from "../../api/generated/room-crud/room-crud";
import type { Room } from "../../api/generated/model";
import { AdminTable, type DeleteState } from "./AdminTable";
import { RoomsFormModal } from "./RoomsFormModal";

export function RoomsTable() {
  const queryClient = useQueryClient();
  const { data: rawRooms = [], isLoading } = useRoomsIndex();
  const rooms = rawRooms as unknown as Room[];

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>(undefined);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  const destroy = useRoomsDestroy({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getRoomsIndexQueryKey() });
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

  const columns = useMemo<MRT_ColumnDef<Room>[]>(
    () => [
      { accessorKey: "code", header: "Code", size: 90 },
      { accessorKey: "name", header: "Nom" },
      {
        accessorKey: "color",
        header: "Couleur",
        enableSorting: false,
        Cell: ({ cell }) => (
          <Group gap="xs">
            <ColorSwatch color={cell.getValue<string>()} size={16} />
            {cell.getValue<string>()}
          </Group>
        ),
      },
      {
        accessorKey: "unlimited",
        header: "Illimitée",
        size: 90,
        Cell: ({ cell }) => (cell.getValue<boolean>() ? "Oui" : "Non"),
      },
      {
        accessorKey: "url",
        header: "URL",
        enableSorting: false,
        Cell: ({ cell }) => {
          const url = cell.getValue<string | null>();
          return url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#00d4e8" }}>
              {url}
            </a>
          ) : (
            "—"
          );
        },
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditingRoom(undefined);
    openModal();
  };
  const openEdit = (room: Room) => {
    setEditingRoom(room);
    openModal();
  };

  const handleDelete = (room: Room) => {
    setDeleteState({ id: room.id, error: null });
    destroy.mutate({ room: room.id });
  };

  return (
    <>
      <AdminTable
        title="Salles"
        columns={columns}
        data={rooms}
        isLoading={isLoading}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
        deleteState={deleteState}
        deleteConfirmMessage="Supprimer cette salle ?"
        initialSortId="name"
      />
      <RoomsFormModal opened={modalOpened} onClose={closeModal} room={editingRoom} />
    </>
  );
}
