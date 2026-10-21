"use client";

import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface RowMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function RowMenu({
  label = "Thao tác",
  items,
}: {
  label?: string;
  items: RowMenuItem[];
}) {
  const btnId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const place = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) place();
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        id={btnId}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500",
          "hover:bg-neutral-100 hover:text-black",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          open && "bg-neutral-100 text-black"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-labelledby={btnId}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-50 min-w-[160px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  item.danger
                    ? "text-primary hover:bg-primary-light"
                    : "text-neutral-800 hover:bg-neutral-50",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
