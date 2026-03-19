import { MultiSelect } from "@mantine/core";
import type { DiscordMember } from "../contexts/DictionaryContext";
import { MemberAvatar } from "./MemberAvatar";

interface Props {
  members: DiscordMember[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  maxValues?: number;
}

export function MembersSelect({ members, value, onChange, label, placeholder, maxValues }: Props) {
  return (
    <MultiSelect
      label={label}
      placeholder={placeholder ?? "Choisir des joueurs"}
      data={members.map((m) => ({ value: m.id, label: m.username }))}
      value={value}
      onChange={onChange}
      searchable
      maxValues={maxValues}
      renderOption={({ option }) => {
        const member = members.find((m) => m.id === option.value);
        return member ? <MemberAvatar member={member} /> : option.label;
      }}
    />
  );
}
