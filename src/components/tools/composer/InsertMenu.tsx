import { useEffect, useRef, useState } from 'react';

export interface InsertOption {
  key: string;
  label: string;
  icon: string;
}

interface InsertMenuProps {
  options: InsertOption[];
  onSelect: (key: string) => void;
}

export default function InsertMenu({ options, onSelect }: InsertMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        挿入 ▾
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 rounded-lg border shadow-lg overflow-hidden min-w-40"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onSelect(opt.key);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left text-sm px-3 py-2 cursor-pointer hover:opacity-80"
              style={{ color: 'var(--color-text)' }}
            >
              <span aria-hidden="true">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
