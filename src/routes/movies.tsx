import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VaultShell } from "@/components/VaultShell";
import { AddMediaDialog } from "@/components/AddMediaDialog";
import { useVault, type Movie } from "@/lib/vault-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Film, Plus, Star, ImageOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movie Theatre · Media Vault" },
      { name: "description", content: "Film archive with posters, ratings and personal reviews." },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { movies, removeMovie } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);

  const sorted = [...movies].sort((a, b) => +new Date(b.loggedAt) - +new Date(a.loggedAt));

  return (
    <VaultShell>
      <div className="p-8 max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-8 border-b border-border pb-5 gap-4">
          <div>
            <div className="font-display text-[10px] tracking-widest text-primary mb-1">// SECTION 02</div>
            <h1 className="text-3xl font-display flex items-center gap-3">
              <Film className="h-7 w-7 text-primary" />
              Movie Theatre
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{movies.length} films logged. Newest first.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1.5" /> Add Movie
          </Button>
        </header>

        {sorted.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground font-display tracking-wider">No films logged yet.</p>
            <Button onClick={() => setAddOpen(true)} variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Add your first movie</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {sorted.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="group text-left flex flex-col gap-2 focus:outline-none"
              >
                <div className="relative aspect-[2/3] rounded-md border border-border bg-surface overflow-hidden group-hover:border-primary transition-colors">
                  {m.coverUrl ? (
                    <img src={m.coverUrl} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
                  )}
                  {m.rating && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/85 backdrop-blur-sm border border-primary/40 rounded px-1.5 py-0.5">
                      <Star className="h-3 w-3 text-primary fill-primary" />
                      <span className="font-display text-[10px] text-primary">{m.rating}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-display text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{m.title}</div>
                  <div className="text-[10px] text-muted-foreground font-display">{m.year}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AddMediaDialog kind="movie" open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl bg-surface border-border max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {selected.title} <span className="text-muted-foreground font-normal text-lg">({selected.year})</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5">
                <div className="aspect-[2/3] rounded-md border border-border bg-background overflow-hidden">
                  {selected.coverUrl ? (
                    <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.rating && (
                      <div className="flex items-center gap-1 bg-primary/15 border border-primary/40 rounded px-2 py-1">
                        <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                        <span className="font-display text-sm text-primary">{selected.rating}</span>
                      </div>
                    )}
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] font-display tracking-wider border-border/70 text-muted-foreground">{t}</Badge>
                    ))}
                    <div className="text-[10px] font-display tracking-widest text-muted-foreground ml-auto">
                      LOGGED {new Date(selected.loggedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }).toUpperCase()}
                    </div>
                  </div>
                  {selected.description && (
                    <p className="text-sm text-foreground/85 leading-relaxed">{selected.description}</p>
                  )}
                  {selected.review && (
                    <div>
                      <div className="font-display text-[10px] tracking-widest text-primary mb-1">PERSONAL REVIEW</div>
                      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap border-l-2 border-primary/40 pl-3 italic">{selected.review}</p>
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        removeMovie(selected.id);
                        setSelected(null);
                        toast.success("Removed from vault");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </VaultShell>
  );
}
