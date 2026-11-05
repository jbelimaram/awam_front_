import { useContext } from "react";
import { ConfirmContext, type ConfirmFn } from "./confirmContextValue";

/** La fenêtre de confirmation d'AWAM : `if (!(await confirm({ title }))) return;` */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm doit être utilisé dans un ConfirmProvider");
  return confirm;
}