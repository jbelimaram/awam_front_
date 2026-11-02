import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Grosses bibliothèques rangées dans des fichiers À PART : chacune n'est
 * téléchargée qu'avec la page qui l'utilise, et reste en cache quand le code
 * d'AWAM change (son nom de fichier ne change pas tant qu'elle ne change pas).
 */
function vendorChunk(id: string): string | undefined {
  if (id.indexOf('node_modules') === -1) return undefined;
  if (/maplibre-gl|terra-draw|@mapbox/.test(id)) return 'carte';
  if (/@turf|polygon-clipping|rbush|robust-predicates|concaveman|kdbush/.test(id)) return 'geo';
  if (/recharts|d3-|victory-vendor/.test(id)) return 'graphiques';
  if (/@fullcalendar|preact/.test(id)) return 'agenda';
  if (/[\\/]react(-dom)?[\\/]|react-router|scheduler/.test(id)) return 'react';
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
})