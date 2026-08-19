import { useEffect, useMemo } from "react";
import { ActionIcon, Group, Image, Input, Loader, Stack, Text } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhotoPlus, IconX } from "@tabler/icons-react";
import "@mantine/dropzone/styles.css";
import type { EventImage } from "../api/event-images";

/** Discord's maximum attachments per message — the same cap the API enforces. */
export const MAX_EVENT_IMAGES = 10;

/** 8 MiB, matching the server rule; below Discord's 10 MiB per-file limit. */
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const THUMB_HEIGHT = 90;

interface Props {
  /** Images already attached to the Discord post (edit mode only). */
  existing: EventImage[];
  /** Picked but not yet uploaded. */
  files: File[];
  onFilesChange: (files: File[]) => void;
  onDeleteExisting: (image: EventImage) => void;
  deletingId?: number | null;
  disabled?: boolean;
  error?: string;
}

export function EventImagesField({
  existing,
  files,
  onFilesChange,
  onDeleteExisting,
  deletingId,
  disabled,
  error,
}: Props) {
  // Object URLs must be revoked or the blobs leak for the life of the page.
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  const total = existing.length + files.length;
  const remaining = MAX_EVENT_IMAGES - total;

  const removeFile = (index: number) => onFilesChange(files.filter((_, i) => i !== index));

  return (
    <Input.Wrapper
      label="Illustrations"
      description="Ajoutées au post Discord de la séance."
      error={error}
    >
      <Stack gap="xs" mt={6}>
        {total > 0 && (
          <Group gap="xs">
            {existing.map((image) => (
              <Thumb
                key={`existing-${image.id}`}
                src={image.url}
                alt={image.filename}
                busy={deletingId === image.id}
                disabled={disabled}
                onRemove={() => onDeleteExisting(image)}
              />
            ))}

            {previews.map((preview, index) => (
              <Thumb
                key={`new-${index}-${preview.file.name}`}
                src={preview.url}
                alt={preview.file.name}
                pending
                disabled={disabled}
                onRemove={() => removeFile(index)}
              />
            ))}
          </Group>
        )}

        {remaining > 0 && (
          <Dropzone
            onDrop={(dropped) =>
              onFilesChange([...files, ...dropped].slice(0, MAX_EVENT_IMAGES - existing.length))
            }
            accept={IMAGE_MIME_TYPE}
            maxSize={MAX_FILE_SIZE}
            maxFiles={remaining}
            disabled={disabled}
            p="sm"
            style={{
              borderColor: "rgba(0, 212, 232, 0.35)",
              boxShadow: "0 0 6px rgba(0, 212, 232, 0.2)",
            }}
          >
            <Group gap="xs" justify="center" style={{ pointerEvents: "none" }}>
              <IconPhotoPlus size={18} stroke={1.5} />
              <Text size="xs" c="dimmed">
                Glisser une image ou cliquer ({remaining} restante{remaining > 1 ? "s" : ""}, 8 Mo
                max)
              </Text>
            </Group>
          </Dropzone>
        )}

        {files.length > 0 && (
          <Text size="xs" c="dimmed">
            {files.length} image{files.length > 1 ? "s" : ""} sera{files.length > 1 ? "ont" : ""}{" "}
            envoyée{files.length > 1 ? "s" : ""} après l'enregistrement.
          </Text>
        )}
      </Stack>
    </Input.Wrapper>
  );
}

function Thumb({
  src,
  alt,
  onRemove,
  busy,
  pending,
  disabled,
}: {
  src: string;
  alt: string;
  onRemove: () => void;
  busy?: boolean;
  pending?: boolean;
  disabled?: boolean;
}) {
  return (
    <div style={{ position: "relative", lineHeight: 0 }}>
      <Image
        src={src}
        alt={alt}
        h={THUMB_HEIGHT}
        w="auto"
        fit="cover"
        radius="sm"
        style={{
          opacity: pending ? 0.65 : 1,
          border: "1px solid rgba(0, 212, 232, 0.35)",
        }}
      />
      <ActionIcon
        size="xs"
        radius="xl"
        color="red"
        variant="filled"
        aria-label={`Retirer ${alt}`}
        disabled={disabled || busy}
        onClick={onRemove}
        style={{ position: "absolute", top: -6, right: -6 }}
      >
        {busy ? <Loader size={10} color="white" /> : <IconX size={12} />}
      </ActionIcon>
    </div>
  );
}
