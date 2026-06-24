import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVault, type GameStatus } from "@/lib/vault-store";
import { searchGameMetadata } from "@/lib/wiki-search"; // Updated import to point to Steam parser
import { toast } from "sonner";
import { Search, Loader2, ImageOff, ChevronLeft } from "lucide-react";

type Kind = "game" | "movie";

interface Props {
  kind: Kind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddMediaDialog({ kind, open, onOpenChange }: Props) {
  const { addGame, addMovie } = useVault();
  const [step, setStep] = useState<"search" | "details">("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<any | null>(null);

  // Shared fields
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // Game extras
  const [status, setStatus] = useState<GameStatus>("Backlog");
  const [magnet, setMagnet] = useState("");
  const [mirror, setMirror] = useState("");
  const [notes, setNotes] = useState("");

  // Movie extras
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");

  const reset = () => {
    setStep("search");
    setQuery(""); setResults([]); setPicked(null);
    setTitle(""); setCoverUrl(""); setDescription(""); setTags("");
    setStatus("Backlog"); setMagnet(""); setMirror(""); setNotes("");
    setYear(""); setRating(""); setReview("");
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (kind === "game") {
        // Run our clean direct Steam storefront fetch
        const r = await searchGameMetadata(query);
        if (r) {
          setResults([r]); // Treat the parsed game payload as a direct list option
        } else {
          setResults([]);
          toast.message("No Steam match found — entering manual mode");
        }
      } else {
        // Fallback or basic handling for films
        setResults([]);
        toast.message("Movie cataloging is set to manual fallback mode");
      }
    } catch (err) {
      toast.error("Metadata extraction engine hit a glitch");
    } finally {
      setLoading(false);
    }
  };

  const pick = (r: any) => {
    setPicked(r);
    setTitle(r.title);
    setCoverUrl(r.coverUrl || r.thumbnail);
    setDescription(r.description);
    if (r.genres) setTags(r.genres.join(", "));
    if (r.releaseYear) setYear(String(r.releaseYear));
    setStep("details");
  };

  const skipToManual = () => {
    setPicked(null);
    setTitle(query);
    setStep("details");
  };

  const save = () => {
    if (!title.trim()) return toast.error("Title required");
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (kind === "game") {
      addGame({
        title, coverUrl, description, tags: tagList,
        status, magnet, mirrorUrl: mirror, notes,
      });
      toast.success("Game archived to Vault");
    } else {
      addMovie({
        title, coverUrl, description, tags: tagList,
        year: Number(year) || new Date().getFullYear(),
        rating, review,
      });
      toast.success("Movie logged successfully");
    }
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest uppercase text-primary">
            {step === "search" ? `Find ${kind === "game" ? "Game via Steam" : "Movie"}` : "Confirm Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "search"
              ? kind === "game" 
                ? "Search the Steam storefront index to automatically scrape high-res box art and developer descriptions."
                : "Enter the title of the film to begin logging details to your diary collection."
              : "Verify or modify details before saving."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => { e.preventDefault(); runSearch(); }}
              className="flex gap-2"
            >
              <Input
                autoFocus
                placeholder={kind === "game" ? "e.g. Cyberpunk 2077" : "e.g. Interstellar"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((r) => (
                  <button
                    key={r.title}
                    onClick={() => pick(r)}
                    className="group text-left rounded-md border border-border bg-background hover:border-primary overflow-hidden transition-colors"
                  >
                    <div className="aspect-[2/3] bg-muted overflow-hidden">
                      {(r.coverUrl || r.thumbnail) ? (
                        <img src={r.coverUrl || r.thumbnail} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium leading-tight line-clamp-2">{r.title}</div>
                      {(r.releaseYear || r.year) && <div className="text-[10px] text-muted-foreground mt-0.5">{r.releaseYear || r.year}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={skipToManual}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Skip data fetch and create item manually →
            </button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("search")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ChevronLeft className="h-3 w-3" /> back to search
            </button>

            <div className="flex gap-4">
              <div className="w-28 shrink-0 aspect-[2/3] rounded-md border border-border bg-background overflow-hidden">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
                <Field label="Cover image URL"><Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} /></Field>
                <Field label="Tags (comma separated)"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={kind === "game" ? "RPG, Indie" : "Drama, Surreal"} /></Field>
              </div>
            </div>

            <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>

            {kind === "game" ? (
              <>
                <Field label="Status">
                  <Select value={status} onValueChange={(v) => setStatus(v as GameStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Playing">Playing</SelectItem>
                      <SelectItem value="Backlog">Backlog</SelectItem>
                      <SelectItem value="Mastered">Mastered</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Magnet link"><Input value={magnet} onChange={(e) => setMagnet(e.target.value)} placeholder="magnet:?xt=urn:btih:..." /></Field>
                <Field label="Direct mirror URL"><Input value={mirror} onChange={(e) => setMirror(e.target.value)} placeholder="https://..." /></Field>
                <Field label="Personal setup notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
                  <Field label="Rating (e.g. 9/10)"><Input value={rating} onChange={(e) => setRating(e.target.value)} /></Field>
                </div>
                <Field label="Personal review"><Textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} /></Field>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save to Vault
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-display text-[10px] tracking-widest text-muted-foreground uppercase">{label}</Label>
      {children}
    </div>
  );
}