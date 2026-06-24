import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type GameStatus = "Playing" | "Backlog" | "Mastered";

export interface Game {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  tags: string[];
  status: GameStatus;
  magnet: string;
  mirrorUrl: string;
  notes: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  coverUrl: string;
  description: string;
  tags: string[];
  review: string;
  rating: string;
  loggedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  embed: string;
}

interface VaultData {
  games: Game[];
  movies: Movie[];
  playlists: Playlist[];
}

const STORAGE_KEY = "media-vault-v2";

const seed: VaultData = {
  games: [
    {
      id: "g1",
      title: "Hollow Knight: Silksong",
      coverUrl: "https://upload.wikimedia.org/wikipedia/en/4/45/Hollow_Knight_Silksong.jpg",
      description: "Action-adventure Metroidvania developed by Team Cherry, sequel to Hollow Knight, following Hornet through the haunted kingdom of Pharloom.",
      tags: ["Metroidvania", "Indie"],
      status: "Playing",
      magnet: "magnet:?xt=urn:btih:EXAMPLEHASH1234567890ABCDEF&dn=Silksong",
      mirrorUrl: "https://mega.nz/folder/example",
      notes: "Run setup.exe as admin. Patch v1.0.2 included in /patches.",
    },
    {
      id: "g2",
      title: "Disco Elysium",
      coverUrl: "https://upload.wikimedia.org/wikipedia/en/2/2d/Disco_Elysium.jpg",
      description: "Open-ended role-playing game by ZA/UM. A detective with a unique skill system investigates a murder in a fractured city.",
      tags: ["RPG", "Narrative"],
      status: "Mastered",
      magnet: "magnet:?xt=urn:btih:EXAMPLEHASHDISCO1234567890&dn=DiscoElysium",
      mirrorUrl: "https://qiwi.gg/folder/example",
      notes: "Install GOG offline installer, no DRM.",
    },
  ],
  movies: [
    {
      id: "m1",
      title: "Perfect Days",
      year: 2023,
      coverUrl: "https://upload.wikimedia.org/wikipedia/en/5/5f/Perfect_Days_poster.jpg",
      description: "Wim Wenders drama about Hirayama, a Tokyo toilet cleaner who finds beauty in his daily routine.",
      tags: ["Drama", "Slow"],
      review: "Hirayama's quiet routine becomes a meditation on small joys. Wenders at his most tender.",
      rating: "9/10",
      loggedAt: new Date("2026-05-12").toISOString(),
    },
    {
      id: "m2",
      title: "Mulholland Drive",
      year: 2001,
      coverUrl: "https://upload.wikimedia.org/wikipedia/en/c/ca/Mulholland_Drive_%282001_film%29.jpg",
      description: "David Lynch neo-noir mystery about an amnesiac woman and an aspiring actress unraveling a Hollywood dream.",
      tags: ["Mystery", "Surreal"],
      review: "Watched again. The Club Silencio scene still wrecks me.",
      rating: "10/10",
      loggedAt: new Date("2026-03-02").toISOString(),
    },
  ],
  playlists: [
    { id: "p1", name: "Late Night Archive", embed: "37i9dQZF1DX4sWSpwq3LiO" },
    { id: "p2", name: "Cassette Rewind", embed: "37i9dQZF1DWWzBc3TOlaAV" },
  ],
};

interface VaultContextValue extends VaultData {
  addGame: (g: Omit<Game, "id">) => void;
  addMovie: (m: Omit<Movie, "id" | "loggedAt">) => void;
  addPlaylist: (p: Omit<Playlist, "id">) => void;
  removeGame: (id: string) => void;
  removeMovie: (id: string) => void;
  removePlaylist: (id: string) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VaultData>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data, hydrated]);

  const value: VaultContextValue = {
    ...data,
    addGame: (g) => setData((d) => ({ ...d, games: [{ ...g, id: uid() }, ...d.games] })),
    addMovie: (m) =>
      setData((d) => ({
        ...d,
        movies: [{ ...m, id: uid(), loggedAt: new Date().toISOString() }, ...d.movies],
      })),
    addPlaylist: (p) => setData((d) => ({ ...d, playlists: [{ ...p, id: uid() }, ...d.playlists] })),
    removeGame: (id) => setData((d) => ({ ...d, games: d.games.filter((g) => g.id !== id) })),
    removeMovie: (id) => setData((d) => ({ ...d, movies: d.movies.filter((m) => m.id !== id) })),
    removePlaylist: (id) => setData((d) => ({ ...d, playlists: d.playlists.filter((p) => p.id !== id) })),
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
