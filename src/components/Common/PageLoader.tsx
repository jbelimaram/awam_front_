/**
 * Indicateur de chargement d'une page entière : une petite pousse sort de
 * la terre, ouvre ses deux feuilles et se balance, puis recommence.
 *
 * Affiché par le chargement à la demande (React.lazy), le temps que le code
 * d'une page soit téléchargé : souvent moins d'une seconde.
 *
 * Animation en SVG et CSS : nette à toutes les tailles, quelques Ko, fond
 * transparent. Si l'utilisateur a demandé moins d'animations dans son
 * système, la pousse reste immobile.
 */

const CSS = `
@keyframes awam-stem { 0% { transform: scaleY(0) } 35%, 100% { transform: scaleY(1) } }
@keyframes awam-leaf-l { 0%, 30% { transform: rotate(60deg) scale(0) } 55%, 100% { transform: rotate(0) scale(1) } }
@keyframes awam-leaf-r { 0%, 30% { transform: rotate(-60deg) scale(0) } 55%, 100% { transform: rotate(0) scale(1) } }
@keyframes awam-sway { 0%, 55% { transform: rotate(0) } 70% { transform: rotate(-4deg) } 85% { transform: rotate(3deg) } 100% { transform: rotate(0) } }
@keyframes awam-soil { 0%, 20%, 100% { transform: translateY(0) } 10% { transform: translateY(-3px) } }
@keyframes awam-fade { 0% { opacity: 0 } 8%, 88% { opacity: 1 } 100% { opacity: 0 } }
@keyframes awam-dot { 0%, 80%, 100% { opacity: .2 } 40% { opacity: 1 } }
.awam-loader .plant { animation: awam-fade 2.6s ease-in-out infinite }
.awam-loader .sway  { animation: awam-sway 2.6s ease-in-out infinite; transform-origin: 60px 78px; transform-box: view-box }
.awam-loader .stem  { animation: awam-stem 2.6s ease-out infinite; transform-origin: 60px 78px; transform-box: view-box }
.awam-loader .leaf-l { animation: awam-leaf-l 2.6s ease-out infinite; transform-origin: 60px 50px; transform-box: view-box }
.awam-loader .leaf-r { animation: awam-leaf-r 2.6s ease-out infinite; transform-origin: 60px 50px; transform-box: view-box }
.awam-loader .s1 { animation: awam-soil 2.6s ease-out infinite }
.awam-loader .s2 { animation: awam-soil 2.6s ease-out .08s infinite }
.awam-loader .s3 { animation: awam-soil 2.6s ease-out .16s infinite }
.awam-loader .d1, .awam-loader .d2, .awam-loader .d3 { animation: awam-dot 1.2s infinite }
.awam-loader .d2 { animation-delay: .2s }
.awam-loader .d3 { animation-delay: .4s }
@media (prefers-reduced-motion: reduce) {
  .awam-loader * { animation: none !important }
}
`;

export default function PageLoader() {
  return (
    <div
      className="awam-loader"
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{CSS}</style>
      <svg width="130" height="110" viewBox="0 0 120 100" aria-hidden>
        <g className="plant">
          <g className="sway">
            <rect className="stem" x="57.5" y="48" width="5" height="30" rx="2.5" fill="#97C459" />
            <path className="leaf-l" d="M60 50 C52 36 34 34 28 40 C34 52 50 56 60 50 Z" fill="#97C459" />
            <path className="leaf-r" d="M60 50 C68 36 86 34 92 40 C86 52 70 56 60 50 Z" fill="#97C459" />
          </g>
        </g>
        <g fill="#5F5E5A">
          <circle className="s1" cx="44" cy="82" r="3.2" />
          <circle className="s2" cx="54" cy="88" r="2.2" />
          <circle className="s3" cx="66" cy="87" r="3.2" />
          <circle className="s1" cx="76" cy="81" r="2.4" />
          <circle className="s2" cx="60" cy="81" r="1.8" />
          <circle className="s3" cx="36" cy="88" r="1.6" />
          <circle className="s1" cx="84" cy="88" r="1.6" />
        </g>
      </svg>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: 2, color: "#D85A30" }}>
        CHARGEMENT
        <span className="d1">.</span>
        <span className="d2">.</span>
        <span className="d3">.</span>
      </div>
    </div>
  );
}