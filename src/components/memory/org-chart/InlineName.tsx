"use client";

import { useState } from "react";
import { FIELD } from "./styles";

/** A name typed in the box: Enter saves, Escape or leaving the field cancels. */
export function InlineName({ label, initial = "", onSubmit, onCancel }: { label: string; initial?: string; onSubmit: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      aria-label={label}
      placeholder={label}
      value={value}
      maxLength={120}
      className={`${FIELD} mt-1.5 w-full`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
      }}
    />
  );
}
