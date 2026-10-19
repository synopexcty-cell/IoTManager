"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-800"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-black",
            "placeholder:text-neutral-400",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60",
            error && "border-primary focus:ring-primary/30",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-primary">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
