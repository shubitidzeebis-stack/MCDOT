"use client";

import { HONEYPOT_FIELD } from "@/lib/security/honeypot";

export function HoneypotField({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label>
        Website (leave blank)
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          name={HONEYPOT_FIELD}
          value={value}
          onChange={onChange}
        />
      </label>
    </div>
  );
}
