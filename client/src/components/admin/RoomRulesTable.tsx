import { useMemo, useState } from "react";
import "../../styles/admin-table.css";
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from "mantine-react-table";
import { ActionIcon, Badge, Button, Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRoomRulesIndexQueryKey,
  useRoomRulesDestroy,
  useRoomRulesIndex,
} from "../../api/generated/room-rule/room-rule";
import type { RoomRule } from "../../api/generated/model";
import { useDictionary } from "../../contexts/DictionaryContext";
import { RoomRuleFormModal } from "./RoomRuleFormModal";

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAY_SHORT: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam", 7: "Dim",
};

const SCOPE_LABEL: Record<string, string> = {
  daily: "Tous les jours",
  weekly: "Hebdomadaire",
  once: "Ponctuel",
};

// ── Delete button ──────────────────────────────────────────────────────────────

function DeleteButton({ rule }: { rule: RoomRule }) {
  const [opened, setOpened] = useState(false);
  const queryClient = useQueryClient();

  const destroy = useRoomRulesDestroy({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getRoomRulesIndexQueryKey() });
        setOpened(false);
      },
    },
  });

  return (
    <Popover opened={opened} onClose={() => setOpened(false)} position="left" withArrow>
      <Popover.Target>
        <ActionIcon variant="subtle" color="red" size="md" onClick={() => setOpened(true)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm">Supprimer cette règle ?</Text>
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={() => setOpened(false)}>
              Annuler
            </Button>
            <Button
              size="xs"
              color="red"
              loading={destroy.isPending}
              onClick={() => destroy.mutate({ roomRule: rule.id })}
            >
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────────

export function RoomRulesTable() {
  const { rooms } = useDictionary();
  const { data: rules = [], isLoading } = useRoomRulesIndex();

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingRule, setEditingRule] = useState<RoomRule | undefined>(undefined);

  const openCreate = () => {
    setEditingRule(undefined);
    openModal();
  };

  const openEdit = (rule: RoomRule) => {
    setEditingRule(rule);
    openModal();
  };

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

  const table = useMantineReactTable({
    columns,
    data: rules,
    state: { isLoading },
    enableHiding: false,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableSorting: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableTopToolbar: false,
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": {
        header: "",
        Header: () => (
          <Button
            size="xs"
            variant="light"
            color="neon"
            leftSection={<IconPlus size={14} />}
            onClick={openCreate}
          >
            Créer
          </Button>
        ),
        size: 90,
      },
    },
    renderRowActions: ({ row }) => (
      <Group gap={4} wrap="nowrap">
        <ActionIcon variant="subtle" color="neon" size="md" onClick={() => openEdit(row.original)}>
          <IconEdit size={16} />
        </ActionIcon>
        <DeleteButton rule={row.original} />
      </Group>
    ),
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
      withTableBorder: true,
      withColumnBorders: true,
    },
    initialState: {
      sorting: [{ id: "priority", desc: true }],
      showGlobalFilter: true,
    },
  });

  return (
    <>
      <div style={{ padding: "1rem", marginTop: 64 }}>
        <MantineReactTable table={table} />
      </div>

      <RoomRuleFormModal
        opened={modalOpened}
        onClose={closeModal}
        rule={editingRule}
      />
    </>
  );
}
