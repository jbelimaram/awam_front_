import { useToast } from '../../hooks/useToast.ts';

/**
 * Couleurs CLAIRES des messages, les mêmes teintes douces que les étiquettes
 * et les encadrés d'AWAM : un fond pâle, une bordure et un texte foncé de la
 * même teinte. Un seul style sur toutes les pages, connexion comprise.
 *
 * Les couleurs sont écrites en clair (pas de variables CSS) : la zone des
 * messages est à la racine de l'application, en dehors de toutes les pages,
 * et les variables d'une page ne l'atteignent pas.
 */
const VARIANT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#EAF3DE', border: '#C0DD97', text: '#27500A', icon: '✓' },
  error: { bg: '#FCEBEB', border: '#F7C1C1', text: '#791F1F', icon: '!' },
  loading: { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151', icon: '' },
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    // z-[2000] : au-dessus de tout le reste de l'application (barre du haut
    // à 100, menu du compte à 200, fenêtres à 500, panneau de la cloche à
    // 1000) ; sinon la barre du haut recouvrirait les messages
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => {
        const st = VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.loading;
        return (
          <div
            key={toast.id}
            role="alert"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
              background: st.bg, border: `1px solid ${st.border}`, color: st.text,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)', fontSize: 13, fontFamily: 'system-ui, sans-serif',
            }}
          >
            {toast.variant === 'loading' ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <span
                aria-hidden
                style={{
                  width: 20, height: 20, flexShrink: 0, borderRadius: '50%', background: st.text, color: st.bg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                }}
              >
                {st.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fermer"
              style={{ border: 'none', background: 'transparent', color: st.text, opacity: 0.6, cursor: 'pointer', fontSize: 13, padding: 0 }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}