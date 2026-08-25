import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, FolderKanban, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/hooks/queries/useGlobalSearch";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function highlight(text: string, term: string) {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(term, 250);
  const { data, isFetching } = useGlobalSearch(debounced);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const showPanel = open && debounced.length >= 2;
  const projects = data?.projects ?? [];
  const candidates = data?.candidates ?? [];
  const hasResults = projects.length > 0 || candidates.length > 0;

  const go = (path: string) => {
    setOpen(false);
    setTerm("");
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-[320px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un poste ou un candidat…"
        className="pl-9"
        aria-label="Recherche globale"
      />
      {showPanel && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full sm:w-[420px] max-h-[420px] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
          {isFetching && !data && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recherche…
            </div>
          )}
          {data && !hasResults && (
            <div className="py-6 text-center text-sm text-muted-foreground">Aucun résultat</div>
          )}

          {projects.length > 0 && (
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Postes</div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`/projects/${p.id}`)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                  )}
                >
                  <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{highlight(p.title, debounced)}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.session_count} session{p.session_count > 1 ? "s" : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {candidates.length > 0 && (
            <div className="border-t p-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Candidats</div>
              {candidates.map((c) => {
                const name = c.candidate_name || c.candidate_email || "Candidat";
                return (
                  <button
                    key={c.id}
                    onClick={() => go(`/sessions/${c.id}`)}
                    className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{highlight(name, debounced)}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.candidate_email ? `${c.candidate_email} · ` : ""}
                        {c.project_title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
