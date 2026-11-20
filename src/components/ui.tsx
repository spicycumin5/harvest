import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CROP_TYPES, CROPS, type CropType } from "../game/crops";
import { CropIcon } from "../art/Crop";

export function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CropPicker({ value, onChange, size = 56 }: { value: CropType; onChange: (c: CropType) => void; size?: number }) {
  return (
    <div className="crop-picker" role="radiogroup" aria-label="Crop">
      {CROP_TYPES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          className={`crop-option${value === c ? " selected" : ""}`}
          onClick={() => onChange(c)}
        >
          <CropIcon type={c} size={size} />
          <span>{CROPS[c].label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            className="toast"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Loading({ label = "Waking up the farm…" }: { label?: string }) {
  return (
    <div className="loading">
      <span className="loading-sprout" aria-hidden="true">🌱</span>
      <p className="muted">{label}</p>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="error">{error instanceof Error ? error.message : String(error)}</p>;
}
