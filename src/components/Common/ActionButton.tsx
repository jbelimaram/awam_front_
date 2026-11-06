import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react";
import BusyLabel from "./BusyLabel";

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** L'action ; si elle renvoie une promesse, le bouton attend sa fin */
  onClick: (event: MouseEvent<HTMLButtonElement>) => unknown;
  /** Texte pendant l'opération, ex. « Suppression… » ; sans texte, le cercle seul */
  busyText?: string;
  /** État d'attente imposé de l'extérieur (ex. une opération lancée ailleurs) */
  busy?: boolean;
}

/**
 * Bouton qui lance une opération : pendant qu'elle tourne, il garde sa
 * couleur, affiche un petit cercle qui tourne et son texte d'attente, et
 * ignore les clics suivants. Fini les opérations faites deux fois par un
 * double clic.
 */
export default function ActionButton({ onClick, busyText, busy, children, ...rest }: ActionButtonProps) {
  const [running, setRunning] = useState(false);
  // Le bouton est-il encore affiché ? En mode développement, React monte,
  // démonte puis remonte chaque composant (mode strict) : on remet donc
  // « affiché » à chaque montage, sinon le cercle ne s'arrêterait jamais.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const active = Boolean(busy) || running;

  const handle = async (event: MouseEvent<HTMLButtonElement>) => {
    if (active) return;
    const result = onClick(event);
    if (result instanceof Promise) {
      setRunning(true);
      try {
        await result;
      } finally {
        if (mounted.current) setRunning(false);
      }
    }
  };

  return (
    <button type="button" {...rest} aria-busy={active || undefined} onClick={handle}>
      <BusyLabel busy={active} text={busyText}>{children}</BusyLabel>
    </button>
  );
}