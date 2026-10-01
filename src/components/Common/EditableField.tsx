import { useState } from 'react';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: 'text' | 'email';
}

export default function EditableField({ label, value, onSave, type = 'text' }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(value);
    setError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (isSaving) return;
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (draft.trim() === '') {
      setError('Ce champ ne peut pas être vide.');
      return;
    }
    if (draft === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-b border-white/10 pb-3">
      <div className="flex justify-between items-center gap-3">
        <span className="text-sm text-white/60 shrink-0">{label}</span>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium truncate">{value}</span>
            <button
              onClick={startEdit}
              className="text-white/50 hover:text-menthe transition"
              aria-label={`Modifier ${label}`}
            >
              <PencilIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 justify-end">
            <input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isSaving}
              autoFocus
              className="flex-1 max-w-[180px] px-2.5 py-1.5 rounded-md bg-white/10 border border-olive/30 text-white text-sm outline-none focus:border-menthe transition disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-menthe hover:text-menthe/80 transition disabled:opacity-50"
              aria-label="Valider"
            >
              <CheckIcon />
            </button>
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              className="text-white/50 hover:text-terracotta transition disabled:opacity-50"
              aria-label="Annuler"
            >
              <XIcon />
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-terracotta text-xs mt-1.5">{error}</p>}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}