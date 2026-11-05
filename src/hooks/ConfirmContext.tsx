import { useCallback, useRef, useState, type ReactNode } from "react";
import Dialog from "../components/Common/Dialog";
import { dialogButton } from "../components/Common/dialogStyles";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "./confirmContextValue";

/**
 * Fenêtre de confirmation d'AWAM, à la place de window.confirm (la petite
 * fenêtre du navigateur, « localhost indique… »). Un seul exemplaire pour
 * toute l'app : `const confirm = useConfirm()`, puis
 * `if (!(await confirm({ title: "Supprimer … ?" }))) return;`.
 * Échap, la croix ou un clic à côté valent « Annuler ».
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // Une confirmation encore ouverte vaut « Annuler »
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const paragraphs = options?.message === undefined ? [] : Array.isArray(options.message) ? options.message : [options.message];
  const danger = (options?.tone ?? "danger") === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        isOpen={options !== null}
        onClose={() => answer(false)}
        title={options?.title ?? ""}
        width={440}
        footer={
          <>
            <button type="button" onClick={() => answer(false)} style={dialogButton.secondary}>
              {options?.cancelLabel ?? "Annuler"}
            </button>
            <button type="button" autoFocus onClick={() => answer(true)} style={danger ? dialogButton.danger : dialogButton.primary}>
              {options?.confirmLabel ?? "Supprimer"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span
            aria-hidden
            style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "inline-flex",
              alignItems: "center", justifyContent: "center", fontSize: 16,
              background: danger ? "#FCEBEB" : "#EAF3DE",
            }}
          >
            {danger ? "🗑" : "?"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
            {paragraphs.map((p) => (
              <p key={p} style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.55 }}>{p}</p>
            ))}
            {danger && (
              <p style={{ margin: 0, fontSize: 12, color: "#A32D2D" }}>Cette action est définitive.</p>
            )}
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}