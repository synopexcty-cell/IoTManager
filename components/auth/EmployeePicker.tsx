"use client";

import { cn, foldVi, normalizeEmployeeCode } from "@/lib/utils";
import type { LoginRosterItem } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function EmployeePicker({
  id = "employee-code",
  label = "Mã nhân viên",
  value,
  onChange,
  options,
  disabled,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (code: string) => void;
  options: LoginRosterItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const query = foldVi(value);
  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((item) => {
      const code = foldVi(item.employeeCode);
      const name = foldVi(item.name);
      return code.includes(query) || name.includes(query);
    });
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const pick = (item: LoginRosterItem) => {
    onChange(item.employeeCode);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          autoComplete="username"
          placeholder="Gõ mã NV hoặc tên…"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          className={cn(
            "h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white py-2 pl-3 pr-11 text-sm text-black",
            "placeholder:text-neutral-400",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Mở danh sách nhân viên"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-black"
        >
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          className="absolute top-[calc(100%+4px)] z-30 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-500">
              {options.length === 0
                ? "Gõ mã nhân viên nếu danh sách chưa tải"
                : "Không khớp — vẫn có thể gõ mã NV"}
            </li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.employeeCode} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  data-active={i === highlight ? "true" : "false"}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(item)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                    i === highlight ? "bg-neutral-100" : "hover:bg-neutral-50"
                  )}
                >
                  <span className="truncate font-medium text-black">{item.name}</span>
                  <span className="shrink-0 font-mono text-xs text-neutral-500">
                    {item.employeeCode}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function resolveLoginCode(
  raw: string,
  options: LoginRosterItem[]
): string {
  const typed = normalizeEmployeeCode(raw.replace(/\s/g, ""));
  if (!typed) return "";
  const exact = options.find(
    (o) => normalizeEmployeeCode(o.employeeCode) === typed
  );
  if (exact) return exact.employeeCode;
  const q = foldVi(raw);
  const exactName = options.filter((o) => foldVi(o.name) === q);
  if (exactName.length === 1) return exactName[0].employeeCode;
  const partial = options.filter(
    (o) => foldVi(o.name).includes(q) || foldVi(o.employeeCode).includes(q)
  );
  if (q && partial.length === 1) return partial[0].employeeCode;
  return typed;
}
