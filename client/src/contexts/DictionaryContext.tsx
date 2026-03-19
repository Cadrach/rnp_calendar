import { createContext, useContext } from "react";
import { Center, Loader } from "@mantine/core";
import type { Game, Room, Scenario, User } from "../api/generated/model";
import { useDictionary as useDictionaryQuery } from "../api/generated/dictionary/dictionary";

export interface DiscordMember {
  id: string;
  username: string;
  avatar: string | null;
}

interface DictionaryContext {
  user: User;
  games: Game[];
  rooms: Room[];
  scenarios: Scenario[];
  members: DiscordMember[];
}

const DictionaryContext = createContext<DictionaryContext | null>(null);

export function DictionaryProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useDictionaryQuery();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <DictionaryContext.Provider
      value={{
        user: data.user,
        games: data.games,
        rooms: data.rooms,
        scenarios: data.scenarios,
        members: (data.members ?? []) as DiscordMember[],
      }}
    >
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): DictionaryContext {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error("useDictionary must be used within DictionaryProvider");
  return ctx;
}
