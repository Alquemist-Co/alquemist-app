"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Search, X, Package, FileText, Leaf, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { globalSearch, type SearchResult } from "@/lib/actions/search";

const HISTORY_KEY = "alquemist-search-history";
const MAX_HISTORY = 10;

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Search; label: string; color: string }
> = {
  batch: { icon: Leaf, label: "Batch", color: "text-brand" },
  order: { icon: FileText, label: "Orden", color: "text-info" },
  product: { icon: Package, label: "Producto", color: "text-warning" },
  zone: { icon: MapPin, label: "Zona", color: "text-success" },
  user: { icon: User, label: "Usuario", color: "text-text-secondary" },
};

export function SearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          const res = await globalSearch(q);
          setResults(res);
          setSelectedIndex(0);
        });
      }, 300);
    },
    [],
  );

  function handleInputChange(value: string) {
    setQuery(value);
    doSearch(value);
  }

  function saveToHistory(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(
      0,
      MAX_HISTORY,
    );
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function navigate(result: SearchResult) {
    saveToHistory(query);
    setOpen(false);
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex]);
    }
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  let flatIndex = 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar batches, ordenes, productos..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleInputChange("")}
              className="text-text-secondary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-secondary sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {isPending && (
            <p className="px-3 py-4 text-center text-xs text-text-secondary">
              Buscando...
            </p>
          )}

          {!isPending && query.length >= 2 && results.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-text-secondary">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}

          {!isPending &&
            Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.batch;
              return (
                <div key={type} className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                    {config.label}s
                  </p>
                  {items.map((result) => {
                    const idx = flatIndex++;
                    const Icon = config.icon;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => navigate(result)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          idx === selectedIndex
                            ? "bg-brand/10"
                            : "hover:bg-surface-secondary",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {result.title}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {result.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}

          {/* History */}
          {query.length < 2 && history.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Busquedas recientes
              </p>
              {history.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleInputChange(term)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-secondary"
                >
                  <Search className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">{term}</span>
                </button>
              ))}
            </div>
          )}

          {query.length < 2 && history.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-text-secondary">
              Escribe al menos 2 caracteres para buscar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
