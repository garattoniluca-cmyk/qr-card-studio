import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');

/** Token del design system (vedi docs/DESIGN-SYSTEM.md). */
export default {
  content: [`${here}/index.html`, `${here}/src/**/*.{js,jsx}`],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '1rem', control: '0.75rem' },
      boxShadow: {
        primary: '0 4px 6px -1px rgb(199 210 254 / 1), 0 2px 4px -2px rgb(199 210 254 / 1)',
      },
    },
  },
  plugins: [],
};
