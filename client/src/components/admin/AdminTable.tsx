import { useState } from "react";
import type React from "react";
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from "mantine-react-table";
import { ActionIcon, Alert, Button, Group, Popover, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import "../../styles/admin-table.css";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeleteState {
  id: number;
  error: string | null;
}

export interface AdminTableProps<T extends { id: number }> {
  columns: MRT_ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  onCreate: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  deleteState?: DeleteState | null;
  deleteConfirmMessage?: string;
  initialSortId?: string;
  initialSortDesc?: boolean;
  width?: React.CSSProperties["width"];
}

// ── Delete button ──────────────────────────────────────────────────────────────

function DeleteButton<T extends { id: number }>({
  onDelete,
  isDeleting,
  error,
  confirmMessage,
}: {
  row: T;
  onDelete: () => void;
  isDeleting: boolean;
  error: string | null;
  confirmMessage: string;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <Popover opened={opened} onClose={() => setOpened(false)} position="left" withArrow>
      <Popover.Target>
        <ActionIcon variant="subtle" color="red" size="md" onClick={() => setOpened(true)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          {error ? (
            <Alert icon={<IconAlertCircle size={14} />} color="red" p="xs" radius="sm">
              <Text size="xs">{error}</Text>
            </Alert>
          ) : (
            <Text size="sm">{confirmMessage}</Text>
          )}
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={() => setOpened(false)}>
              {error ? "Fermer" : "Annuler"}
            </Button>
            {!error && (
              <Button size="xs" color="red" loading={isDeleting} onClick={onDelete}>
                Supprimer
              </Button>
            )}
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// ── AdminTable ─────────────────────────────────────────────────────────────────

export function AdminTable<T extends { id: number }>({
  columns,
  data,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
  deleteState,
  deleteConfirmMessage = "Supprimer cet élément ?",
  initialSortId,
  initialSortDesc = false,
  width,
}: AdminTableProps<T>) {
  const table = useMantineReactTable({
    columns,
    data,
    state: { isLoading: isLoading ?? false },
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
            onClick={onCreate}
          >
            Créer
          </Button>
        ),
        size: 90,
      },
    },
    renderRowActions: ({ row }) => (
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="neon"
          size="md"
          onClick={() => onEdit(row.original)}
        >
          <IconEdit size={16} />
        </ActionIcon>
        <DeleteButton
          row={row.original}
          onDelete={() => onDelete(row.original)}
          isDeleting={deleteState?.id === row.original.id && deleteState?.error === null}
          error={deleteState?.id === row.original.id ? deleteState.error : null}
          confirmMessage={deleteConfirmMessage}
        />
      </Group>
    ),
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
      withTableBorder: true,
      withColumnBorders: true,
    },
    initialState: {
      showGlobalFilter: true,
      ...(initialSortId
        ? { sorting: [{ id: initialSortId, desc: initialSortDesc }] }
        : {}),
    },
  });

  return (
    <div style={{ padding: "1rem", marginTop: 64, width }}>
      <MantineReactTable table={table} />
    </div>
  );
}
