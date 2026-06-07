"use client";

import { useEffect, useRef } from "react";

interface InlineEditableTitleProps {
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  onCommit?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function InlineEditableTitle({
  value,
  onChange,
  editing,
  onCommit,
  className = "",
  autoFocus = false,
}: InlineEditableTitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, autoFocus]);

  if (!editing) {
    return <h1 className={className}>{value}</h1>;
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onCommit?.()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.currentTarget.blur();
        }
      }}
      className={`w-full bg-transparent p-0 outline-none caret-off-black ${className}`}
      aria-label="Name"
    />
  );
}
