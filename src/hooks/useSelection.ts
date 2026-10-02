import { useContext } from "react";
import { SelectionContext, type SelectionContextType } from "../context/SelectionContext";

export function useSelection(): SelectionContextType {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection doit être utilisé à l'intérieur de <SelectionProvider>.");
  }
  return ctx;
}