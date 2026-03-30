import { useMemo, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Badge } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import type { MRT_ColumnDef } from "mantine-react-table";
import {
  getRoomRulesIndexQueryKey,
  useRoomRulesDestroy,
  useRoomRulesIndex,
} from "../../api/generated/room-rule/room-rule";
import type { RoomRule } from "../../api/generated/model";
import { useDictionary } from "../../contexts/DictionaryContext";
import { AdminTable, type DeleteState } from "./AdminTable";
import { RoomRuleFormModal } from "./RoomRuleFormModal";

const WEEKDAY_SHORT: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
  7: "Dim",
};

const SCOPE_LABEL: Record<string, string> = {
  daily: "Tous les jours",
  weekly: "Hebdomadaire",
  once: "Ponctuel",
};

export function RoomRulesTable() {
  const { rooms } = useDictionary();
  const queryClient = useQueryClient();
  const { data: rules = [], isLoading } = useRoomRulesIndex();

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingRule, setEditingRule] = useState<RoomRule | undefined>(undefined);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  const destroy = useRoomRulesDestroy({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getRoomRulesIndexQueryKey() });
        setDeleteState(null);
      },
      onError: () => {
        setDeleteState((prev) => (prev ? { ...prev, error: "Une erreur est survenue." } : null));
      },
    },
  });

  const roomName = (id: number) => rooms.find((r) => r.id === id)?.name ?? String(id);

  const formatDays = (rule: RoomRule) => {
    if (rule.scope === "once") return rule.date ?? "—";
    if (rule.scope === "weekly") {
      const days = (rule.weekdays as number[] | null) ?? [];
      return days.map((d) => WEEKDAY_SHORT[d] ?? d).join(", ");
    }
    return "—";
  };

  const formatValidity = (rule: RoomRule) => {
    if (!rule.valid_from && !rule.valid_until) return "—";
    return `${rule.valid_from?.slice(0, 10) ?? "…"} → ${rule.valid_until?.slice(0, 10) ?? "…"}`;
  };

  const columns = useMemo<MRT_ColumnDef<RoomRule>[]>(
    () => [
      {
        accessorFn: (r) => roomName(r.room_id),
        id: "room",
        header: "Salle",
      },
      {
        accessorKey: "kind",
        header: "Type",
        Cell: ({ cell }) => (
          <Badge
            variant="filled"
            color={cell.getValue<string>() === "available" ? "neon" : "red"}
            size="sm"
          >
            {cell.getValue<string>() === "available" ? "Disponible" : "Indisponible"}
          </Badge>
        ),
      },
      {
        accessorKey: "scope",
        header: "Récurrence",
        Cell: ({ cell }) => SCOPE_LABEL[cell.getValue<string>()] ?? cell.getValue<string>(),
      },
      {
        accessorFn: formatDays,
        id: "days",
        header: "Jours / Date",
        enableSorting: false,
      },
      {
        accessorKey: "start_time",
        header: "Horaires",
        Cell: ({ row }) =>
          `${row.original.start_time.slice(0, 5).replace(":", "h")} → ${row.original.end_time.slice(0, 5).replace(":", "h")}`,
      },
      {
        accessorFn: formatValidity,
        id: "validity",
        header: "Validité",
        enableSorting: false,
      },
      {
        accessorKey: "priority",
        header: "Priorité",
        size: 80,
      },
      {
        accessorKey: "reason",
        header: "Raison",
        Cell: ({ cell }) => cell.getValue<string | null>() ?? "—",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms],
  );

  const openCreate = () => {
    setEditingRule(undefined);
    openModal();
  };

  const openEdit = (rule: RoomRule) => {
    setEditingRule(rule);
    openModal();
  };

  const handleDelete = (rule: RoomRule) => {
    setDeleteState({ id: rule.id, error: null });
    destroy.mutate({ roomRule: rule.id });
  };

  return (
    <>
      <AdminTable
        title="Règles de disponibilité des salles"
        columns={columns}
        data={rules}
        isLoading={isLoading}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
        deleteState={deleteState}
        deleteConfirmMessage="Supprimer cette règle ?"
        initialSortId="priority"
        initialSortDesc
      />

      <RoomRuleFormModal opened={modalOpened} onClose={closeModal} rule={editingRule} />
    </>
  );
}
