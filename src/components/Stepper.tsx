"use client";

/** Botões − / + para ajustar quantidade. */
export function Stepper({
  value,
  max = 20,
  onChange,
  label,
}: {
  value: number;
  max?: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const btn =
    "grid size-9 cursor-pointer place-items-center rounded-lg text-lg font-semibold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center rounded-xl border border-brand-200 bg-brand-50">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label={`Diminuir ${label}`}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Aumentar ${label}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
