import { createFileRoute } from "@tanstack/react-router";
import { VaultShell } from "@/components/VaultShell";
import { useVault } from "@/lib/vault-store";
import { Music2 } from "lucide-react";

export const Route = createFileRoute("/playlists")({
  head: () => ({
    meta: [
      { title: "Jukebox Hub · Media Vault" },
      { name: "description", content: "Embedded music playlists." },
    ],
  }),
  component: PlaylistsPage,
});

function buildSrc(embed: string): string {
  const trimmed = embed.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed;
  // assume Spotify playlist ID
  return `https://open.spotify.com/embed/playlist/${trimmed}?utm_source=generator&theme=0`;
}

function PlaylistsPage() {
  const { playlists } = useVault();

  return (
    <VaultShell>
      <div className="p-8 max-w-6xl mx-auto">
        <header className="flex items-end justify-between mb-8 border-b border-border pb-5">
          <div>
            <div className="font-display text-[10px] tracking-widest text-primary mb-1">// SECTION 03</div>
            <h1 className="text-3xl font-display flex items-center gap-3">
              <Music2 className="h-7 w-7 text-primary" />
              Jukebox Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Mounted playlists from external providers.</p>
          </div>
          <div className="text-right font-display text-xs text-muted-foreground">
            <div>{playlists.length}</div>
            <div className="tracking-widest text-[10px]">MIXES</div>
          </div>
        </header>

        {playlists.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
            No playlists mounted.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {playlists.map((p) => (
              <article key={p.id} className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base">{p.name}</h2>
                  <span className="font-display text-[10px] tracking-widest text-muted-foreground">▶ STREAM</span>
                </div>
                <div className="rounded-md overflow-hidden border border-border bg-background">
                  <iframe
                    title={p.name}
                    src={buildSrc(p.embed)}
                    width="100%"
                    height="380"
                    frameBorder={0}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="block w-full"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </VaultShell>
  );
}
