import { useState } from "react";
import { Button, Modal, ScrollArea, Stack, Textarea } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useEventDiscordSummary } from "../../api/generated/event/event";

interface DiscordSummaryModalProps {
  opened: boolean;
  onClose: () => void;
}

export function DiscordSummaryModal({ opened, onClose }: DiscordSummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const { data, isLoading, error } = useEventDiscordSummary({
    query: { enabled: opened },
  });

  const content = data?.content ?? "";

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Résumé Discord des parties"
      size="lg"
    >
      <Stack gap="md">
        {isLoading && <div>Chargement...</div>}
        {error && <div>Erreur lors du chargement</div>}
        {!isLoading && !error && (
          <>
            <ScrollArea h={400}>
              <Textarea
                value={content}
                readOnly
                autosize
                minRows={10}
                styles={{
                  input: {
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                  },
                }}
              />
            </ScrollArea>
            <CopyToClipboard text={content} onCopy={handleCopy}>
              <Button
                color={copied ? "teal" : "neon"}
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              >
                {copied ? "Copié !" : "Copier le texte"}
              </Button>
            </CopyToClipboard>
          </>
        )}
      </Stack>
    </Modal>
  );
}
