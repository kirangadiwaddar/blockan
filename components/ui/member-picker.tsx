"use client";

import { useState, useRef, useEffect } from "react";
import { Member } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Check, UserPlus, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  members: Member[];
  selected: Member[];
  onChange: (selected: Member[]) => void;
  placeholder?: string;
  single?: boolean;
  className?: string;
}

export function MemberPicker({
  members,
  selected,
  onChange,
  placeholder = "Search members…",
  single = false,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.role.toLowerCase().includes(query.toLowerCase())
  );

  const isSelected = (m: Member) => selected.some((s) => s.id === m.id);

  const toggle = (m: Member) => {
    if (single) {
      onChange(isSelected(m) ? [] : [m]);
      return;
    }
    onChange(isSelected(m) ? selected.filter((s) => s.id !== m.id) : [...selected, m]);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Selected chips — shown when ≥1 member is selected */}
      {selected.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-3 pt-2.5 pb-2 bg-muted/40 border-b">
          {selected.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 bg-background border border-border rounded-full pl-0.5 pr-2 py-0.5 text-xs font-medium text-foreground shadow-xs"
            >
              <Avatar className="size-4 shrink-0">
                <AvatarImage src={m.avatar} alt={m.name} />
                <AvatarFallback className="text-[8px]" colorSeed={m.id}>{m.initials}</AvatarFallback>
              </Avatar>
              {m.name.split(" ")[0]}
              <button
                onClick={(e) => { e.stopPropagation(); onChange(selected.filter((s) => s.id !== m.id)); }}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {selected.length > 1 && (
            <button
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-auto"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Search size={13} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col py-1 max-h-52 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-5 px-3 text-center">
            <span className="size-8 rounded-lg bg-muted/60 flex items-center justify-center mx-auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <p className="text-xs font-medium">No members found</p>
            {query.trim() ? (
              <button
                onClick={() => { window.location.href = `/team?invite=${encodeURIComponent(query.trim())}`; }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer mt-1"
              >
                <Mail size={12} /> Send invite to "{query.trim()}"
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">Try a different name</p>
            )}
          </div>
        )}

        {/* Unassign all */}
        {!single && selected.length > 0 && query === "" && (
          <button
            onClick={() => onChange([])}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-left transition-colors cursor-pointer"
          >
            <div className="size-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <UserPlus size={11} className="text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground flex-1">Unassign all</span>
          </button>
        )}

        {filtered.map((m) => {
          const active = isSelected(m);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-left transition-colors cursor-pointer",
                active && "bg-muted"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="size-7">
                  <AvatarImage src={m.avatar} alt={m.name} />
                  <AvatarFallback className="text-xs" colorSeed={m.id}>{m.initials}</AvatarFallback>
                </Avatar>
                {active && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-primary flex items-center justify-center">
                    <Check size={8} className="text-primary-foreground" />
                  </span>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-sm leading-tight truncate", active ? "font-semibold" : "font-medium")}>{m.name}</span>
                  {(m as any).isPending && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 font-medium shrink-0">Pending</span>}
                </div>
                <span className="text-xs text-muted-foreground capitalize truncate">{m.role}</span>
              </div>
              {active && <Check size={13} className="text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
