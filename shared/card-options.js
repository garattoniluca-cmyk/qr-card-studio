// Opzioni di stile della scheda condivise tra server (validazione) e client (editor e ProductCard).

export const BG_TYPES = ['solid', 'gradient', 'image'];

export const FONT_FAMILIES = {
  inter: { label: 'Moderno Sans (Inter)', css: "'Inter', sans-serif" },
  playfair: { label: 'Elegante Serif (Playfair)', css: "'Playfair Display', serif" },
  montserrat: { label: 'Geometrico (Montserrat)', css: "'Montserrat', sans-serif" },
  'roboto-mono': { label: 'Tecnico Mono (Roboto)', css: "'Roboto Mono', monospace" },
};

export const BORDER_RADII = {
  soft: { label: 'Morbidi arrotondati', css: '24px' },
  classic: { label: 'Classici leggeri', css: '8px' },
  square: { label: 'Squadrati netti', css: '0px' },
  capsule: { label: 'Extra capsula', css: '36px' },
};

export const DEFAULT_STYLE = Object.freeze({
  bgType: 'gradient',
  bgColor1: '#ffffff',
  bgColor2: '#e0e7ff',
  bgMediaId: null,
  bgOverlay: 40,
  textColor: '#1e293b',
  accentColor: '#4f46e5',
  fontFamily: 'inter',
  borderRadius: 'soft',
});

export const LIMITS = Object.freeze({
  title: 200,
  subtitle: 300,
  price: 60,
  sku: 80,
  category: 100,
  customQrUrl: 2000,
  contentHtml: 2_000_000,
});

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
