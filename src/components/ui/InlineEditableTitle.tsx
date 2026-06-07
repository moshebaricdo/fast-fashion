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

const fieldClass =
  "m-0 block w-full min-w-0 appearance-none border-0 bg-transparent p-0 outline-none caret-off-black";

export function InlineEditableTitle({
  value,
  onChange,
  editing,
  onCommit,
  className = "",
  autoFocus = false,
}: InlineEditableTitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sharedClass = `${fieldClass} ${className}`;

  useEffect(() => {
    if (editing && autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, autoFocus]);

  return (
    <div className="min-h-[1lh]">
      {editing ? (
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
          className={sharedClass}
          aria-label="Name"
        />
      ) : (
        <h1 className={sharedClass}>{value}</h1>
      )}
    </div>
  );
}
