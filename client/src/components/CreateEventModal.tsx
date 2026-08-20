import { useState } from "react";
import { Badge, Button, Group, Loader, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import type { Event } from "../api/generated/model";
import { getDictionaryQueryKey } from "../api/generated/dictionary/dictionary";
import {
  getEventFreeSlotsQueryKey,
  getEventsIndexQueryKey,
  getEventsShowQueryKey,
  useEventsStore,
  useEventsUpdate,
} from "../api/generated/event/event";
import { useRoomFreeSlots } from "../api/generated/room/room";
import { eventImages, eventsImagesStore, useEventsImagesDestroy } from "../api/event-images";
import { useDictionary } from "../contexts/DictionaryContext";
import { addDuration, clampDuration, durationBetween, MIN_EVENT_DURATION } from "../utils/duration";
import { EventImagesField } from "./EventImagesField";
import { EventScheduleFields } from "./EventScheduleFields";
import { MembersSelect } from "./MembersSelect";
import { ScenarioSelect } from "./ScenarioSelect";

interface FreeSlot {
  start: string;
  end: string;
}

interface Props {
  start: Date;
  end: Date;
  onClose: () => void;
  event?: Event;
  initialRoomId?: number | null;
}

export function CreateEventModal({ start, end, onClose, event, initialRoomId }: Props) {
  const { user, games, rooms, members } = useDictionary();
  const queryClient = useQueryClient();

  const mjDiscordId = event ? event.mj_discord_id : user.discord_id;

  const [editStart, setEditStart] = useState(start);
  const [duration, setDuration] = useState(() =>
    clampDuration(durationBetween(start, end), MIN_EVENT_DURATION),
  );
  const [durationInvalid, setDurationInvalid] = useState(false);

  // Illustrations: picked here, uploaded once the event (and so its Discord post) exists.
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imagesError, setImagesError] = useState<string | undefined>(undefined);

  const existingImages = eventImages(event).filter((i) => !deletedImageIds.includes(i.id));

  // Derived, never stored: the server contract still takes datetime_end.
  const editEnd = addDuration(editStart, duration);

  const form = useForm({
    initialValues: {
      room_id: event?.room_id
        ? String(event.room_id)
        : initialRoomId
          ? String(initialRoomId)
          : (null as string | null),
      game_id: event?.game_id ? String(event.game_id) : (null as string | null),
      scenario_key: event?.scenario_id ? `id:${event.scenario_id}` : (null as string | null),
      min_players: event?.min_players ?? (null as number | null),
      max_players: event?.max_players ?? (null as number | null),
      player_ids: (event?.player_ids as string[] | null) ?? [],
    },
    validate: {
      room_id: (v) => (!v ? "La salle est requise" : null),
      game_id: (v) => (!v ? "Le jeu est requis" : null),
      max_players: (v, values) =>
        v && values.min_players && v < values.min_players ? "Doit être ≥ au minimum" : null,
    },
  });

  const roomId = form.values.room_id ? Number(form.values.room_id) : null;
  const dateStr = format(editStart, "yyyy-MM-dd");
  const endDateStr = format(editEnd, "yyyy-MM-dd");

  const { data: rawSlots, isLoading: isLoadingSlots } = useRoomFreeSlots(
    roomId ?? 0,
    { date: dateStr, end_date: endDateStr, event_id: event?.id ?? null },
    { query: { enabled: roomId !== null } },
  );
  const freeSlots = rawSlots as FreeSlot[] | undefined;

  // A slot is "active" if it fully contains the current interval
  const isSlotActive = (slot: FreeSlot) =>
    new Date(slot.start) <= editStart && new Date(slot.end) >= editEnd;

  const intervalValid = !freeSlots || freeSlots.some(isSlotActive);

  const noSlotsAtAll = freeSlots !== undefined && freeSlots.length === 0;

  const invalidate = (eventId?: number) => {
    queryClient.invalidateQueries({ queryKey: getEventsIndexQueryKey() });
    queryClient.invalidateQueries({ queryKey: getDictionaryQueryKey() });
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: getEventsShowQueryKey(eventId) });
    }
    // Booking a room changes its free slots, so the availability grid and the calendar's greyed-out
    // zones go stale too. Three keys: the all-rooms grid, the per-room generated hooks (keyed by
    // URL), and the hand-written availability hooks (keyed by ["rooms", …]).
    // ["/events"] above does not cover ["/events/free-slots"] — query keys match element-wise.
    queryClient.invalidateQueries({ queryKey: getEventFreeSlotsQueryKey() });
    queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/rooms/"),
    });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };

  // Images cannot ride along with the event payload: PHP never populates $_FILES on PUT/PATCH, and
  // on create the Discord post only exists once the event has been saved. Hence a second step.
  const onSuccess = async (saved: Event) => {
    if (newFiles.length > 0) {
      setUploading(true);
      try {
        await eventsImagesStore(saved.id, newFiles);
        setNewFiles([]);
      } catch {
        // The event itself is saved — say so rather than pretending nothing happened.
        setImagesError(
          "Les illustrations n'ont pas pu être envoyées. La séance est enregistrée, réessayez depuis « Modifier ».",
        );
        setUploading(false);
        invalidate(saved.id);
        return;
      }
      setUploading(false);
    }

    invalidate(saved.id);
    onClose();
  };

  const store = useEventsStore({ mutation: { onSuccess } });
  const update = useEventsUpdate({ mutation: { onSuccess } });

  const destroyImage = useEventsImagesDestroy({
    mutation: {
      onSuccess: (_data, variables) => invalidate(variables.event),
      onError: () => {
        setImagesError("L'illustration n'a pas pu être supprimée.");
        setDeletedImageIds([]);
      },
    },
  });

  const handleDeleteImage = (imageId: number) => {
    if (!event) return;
    setImagesError(undefined);
    // Optimistic: drop the thumbnail now, the invalidation confirms it.
    setDeletedImageIds((ids) => [...ids, imageId]);
    destroyImage.mutate({ event: event.id, image: imageId });
  };

  const isPending = store.isPending || update.isPending || uploading;

  const handleGameChange = (value: string | null) => {
    form.setFieldValue("game_id", value);
    form.setFieldValue("scenario_key", null);
  };

  const handleSlotClick = (slot: FreeSlot) => {
    const slotStart = new Date(slot.start);
    setEditStart(slotStart);
    setDuration(clampDuration(durationBetween(slotStart, new Date(slot.end)), MIN_EVENT_DURATION));
    setDurationInvalid(false);
  };

  const formatSlot = (slot: FreeSlot) => {
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    const dayStart = format(s, "EEE", { locale: fr });
    const endPrefix = isSameDay(s, e) ? "" : `${format(e, "EEE", { locale: fr })} `;
    return `${dayStart} ${format(s, "HH'h'mm")} → ${endPrefix}${format(e, "HH'h'mm")}`;
  };

  const handleSubmit = form.onSubmit((values) => {
    if (durationInvalid) return;

    const payload = {
      datetime_start: editStart.toISOString(),
      datetime_end: editEnd.toISOString(),
      mj_discord_id: mjDiscordId!,
      room_id: Number(values.room_id),
      game_id: Number(values.game_id),
      scenario_key: values.scenario_key,
      min_players: values.min_players ?? null,
      max_players: values.max_players ?? null,
      player_ids: values.player_ids.length > 0 ? values.player_ids : null,
    };

    if (event) {
      update.mutate({ event: event.id, data: payload });
    } else {
      store.mutate({ data: payload });
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack mt="sm">
        <Select
          label="Salle"
          placeholder="Choisir une salle"
          required
          data={rooms.map((r) => ({ value: String(r.id), label: r.name ?? r.code }))}
          {...form.getInputProps("room_id")}
        />

        <EventScheduleFields
          start={editStart}
          duration={duration}
          onStartChange={setEditStart}
          onDurationChange={setDuration}
          onDurationInvalidChange={setDurationInvalid}
          error={roomId && !intervalValid ? "Horaire non disponible pour cette salle" : undefined}
        />

        {roomId && (
          <Stack gap={6}>
            {isLoadingSlots ? (
              <Loader size="xs" />
            ) : noSlotsAtAll ? (
              <Text size="xs" c="red">
                Aucun créneau disponible pour cette salle ce jour-là.
              </Text>
            ) : freeSlots && freeSlots.length > 0 ? (
              <Group gap="xs">
                {freeSlots.map((slot) => (
                  <Badge
                    key={slot.start}
                    variant={isSlotActive(slot) ? "filled" : "outline"}
                    color="neon"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSlotClick(slot)}
                  >
                    {formatSlot(slot)}
                  </Badge>
                ))}
              </Group>
            ) : null}
          </Stack>
        )}

        <Select
          label="Jeu"
          placeholder="Choisir un jeu"
          required
          searchable
          data={games.map((g) => ({ value: String(g.id), label: g.name }))}
          value={form.values.game_id}
          onChange={handleGameChange}
          error={form.errors.game_id}
        />

        <ScenarioSelect
          gameId={form.values.game_id}
          value={form.values.scenario_key}
          onChange={(s) => form.setFieldValue("scenario_key", s?.key ?? null)}
        />

        <NumberInput
          label="Joueurs min"
          placeholder="1"
          min={1}
          {...form.getInputProps("min_players")}
        />

        <NumberInput
          label="Joueurs max"
          placeholder="6"
          min={1}
          {...form.getInputProps("max_players")}
        />

        <MembersSelect
          label="Joueurs"
          members={members}
          value={form.values.player_ids}
          onChange={(ids) => form.setFieldValue("player_ids", ids)}
          maxValues={form.values.max_players ?? undefined}
        />

        <EventImagesField
          existing={existingImages}
          files={newFiles}
          onFilesChange={(files) => {
            setImagesError(undefined);
            setNewFiles(files);
          }}
          onDeleteExisting={(image) => handleDeleteImage(image.id)}
          deletingId={destroyImage.isPending ? destroyImage.variables?.image : null}
          disabled={isPending}
          error={imagesError}
        />

        <Button type="submit" loading={isPending} disabled={durationInvalid}>
          {event ? "Modifier" : "Créer"}
        </Button>
      </Stack>
    </form>
  );
}
