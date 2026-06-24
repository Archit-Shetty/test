import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Game, type GameStatus } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, ExternalLink, Check, Gamepad2, Plus, ImageOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games Lounge · Media Vault" },
      { name: "description", content: "Private archive of game entries with covers, magnet links and mirrors." },
    ],
  }),
  component: GamesPage,
});

const FILTERS: ("All" | GameStatus)[] = ["All", "Playing", "Backlog", "Mastered"];

function GamesPage() {
  const { games, removeGame } = useVault();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Game | null>(null);
  const [copied, setCopied] = useState(false);

  const list = filter === "All" ? games : games.filter((g) => g.status === filter);

  const copyMagnet = async (magnet: string) => {
    try {
      await navigator.clipboard.writeText(magnet);
      setCopied(true);
      toast.success("Magnet copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard blocked");
    }
  };

  return (
    <VaultShell>
      <div className="p-8 max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-8 border-b border-border pb-5 gap-4">
          <div>
            <div className="font-display text-[10px] tracking-widest text-primary mb-1">// SECTION 01</div>
            <h1 className="text-3xl font-display flex items-center gap-3">
              <Gamepad2 className="h-7 w-7 text-primary" />
              Games Lounge
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Archived titles with covers, mirrors and seed hashes.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1.5" /> Add Game
          </Button>
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-display tracking-wider rounded border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {f.toUpperCase()} {f === "All" ? `(${games.length})` : ""}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} label="game" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {list.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelected(g)}
                className="group text-left flex flex-col gap-2 focus:outline-none"
              >
                <div className="relative aspect-[3/4] rounded-md border border-border bg-surface overflow-hidden group-hover:border-primary transition-colors">
                  {g.coverUrl ? (
                    <img src={g.coverUrl} alt={g.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
                  )}
                  <div className="absolute top-2 left-2"><StatusPill status={g.status} /></div>
                </div>
                <div className="font-display text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{g.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AddMediaDialog kind="game" open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl bg-surface border-border max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5">
                <div className="aspect-[3/4] rounded-md border border-border bg-background overflow-hidden">
                  {selected.coverUrl ? (
                    <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={selected.status} />
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] font-display tracking-wider border-border/70 text-muted-foreground">{t}</Badge>
                    ))}
                  </div>
                  {selected.description && (
                    <p className="text-sm text-foreground/85 leading-relaxed">{selected.description}</p>
                  )}
                  {selected.notes && (
                    <div>
                      <div className="font-display text-[10px] tracking-widest text-primary mb-1">NOTES</div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-border pl-3">{selected.notes}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" disabled={!selected.magnet} onClick={() => copyMagnet(selected.magnet)}>
                      {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                      {copied ? "Copied!" : "Copy Magnet"}
                    </Button>
                    {selected.mirrorUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={selected.mirrorUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Mirror
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => {
                        removeGame(selected.id);
                        setSelected(null);
                        toast.success("Removed from vault");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                  {selected.magnet && (
                    <div className="font-display text-[10px] text-muted-foreground/60 break-all pt-2 border-t border-border">
                      {selected.magnet}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </VaultShell>
  );
}

function StatusPill({ status }: { status: GameStatus }) {
  const styles: Record<GameStatus, string> = {
    Playing: "bg-accent/90 text-accent-foreground border-accent",
    Backlog: "bg-background/80 text-muted-foreground border-border",
    Mastered: "bg-primary/90 text-primary-foreground border-primary",
  };
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-display tracking-widest border rounded backdrop-blur-sm ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function EmptyState({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
      <p className="text-sm text-muted-foreground font-display tracking-wider">Vault is empty.</p>
      <Button onClick={onAdd} variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Add your first {label}</Button>
    </div>
  );
}
