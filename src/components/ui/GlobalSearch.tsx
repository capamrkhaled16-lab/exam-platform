import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Users, Phone, ChevronLeft } from 'lucide-react';
import { searchStudents } from '@/lib/data';
import type { Student } from '@/lib/types';

type SearchResult = Student & { group_name?: string; grade_name?: string; stage_name?: string };

type Props = {
  onNavigate?: (student: SearchResult) => void;
};

export default function GlobalSearch({ onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const data = await searchStudents(q.trim());
    setResults(data);
    setOpen(true);
    setHighlight(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleSelect(s: SearchResult) {
    setOpen(false);
    setQuery('');
    setResults([]);
    onNavigate?.(s);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-xs">
      <div className="relative">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="بحث طالب بالاسم أو الهاتف..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-9 pl-8 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400">جارٍ البحث...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              لا توجد نتائج لـ «{query}»
            </div>
          ) : (
            <ul className="py-1">
              {results.map((s, i) => (
                <li key={s.id}>
                  <button
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => handleSelect(s)}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 transition ${
                      i === highlight ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-semibold truncate">{s.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {s.group_name && (
                          <span className="flex items-center gap-0.5">
                            <Users size={10} /> {s.group_name}
                          </span>
                        )}
                        {(s.phone || s.parent_phone) && (
                          <span className="flex items-center gap-0.5">
                            <Phone size={10} /> {s.phone ?? s.parent_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronLeft size={14} className="text-slate-600 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
