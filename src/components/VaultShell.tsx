import { Link, useRouterState } from "@tanstack/react-router";
import { Gamepad2, Film, Music2, Archive } from "lucide-react";
import type { ReactNode } from "react";
import { useVault } from "@/lib/vault-store";

const nav = [
  { to: "/games", label: "Games Lounge", icon: Gamepad2, code: "01" },
  { to: "/movies", label: "Movie Theatre", icon: Film, code: "02" },
  { to: "/playlists", label: "Jukebox Hub", icon: Music2, code: "03" },
] as const;

export function VaultShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { games, movies, playlists } = useVault();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            <div className="font-display text-sm tracking-widest uppercase">Media Vault</div>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground font-display tracking-widest">
            PRIVATE ARCHIVE
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
                }`}
              >
                <span className="font-display text-[10px] text-muted-foreground/70 w-5">{item.code}</span>
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="GMS" value={games.length} />
            <Stat label="FLM" value={movies.length} />
            <Stat label="MIX" value={playlists.length} />
          </div>
          <div className="text-[10px] font-display tracking-widest text-muted-foreground/40 text-center">
            v1.1.0
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 relative scanlines">{children}</main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-background/40 py-1.5">
      <div className="font-display text-sm text-primary">{value}</div>
      <div className="font-display text-[9px] text-muted-foreground tracking-widest">{label}</div>
    </div>
  );
}
