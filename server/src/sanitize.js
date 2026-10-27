// Sanitizzazione in whitelist del contenuto HTML prodotto dall'editor TipTap.
import sanitizeHtml from 'sanitize-html';

const COLOR = [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/];

const OPTIONS = {
  allowedTags: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      color: COLOR,
      'text-align': [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: [] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
    b: 'strong',
    i: 'em',
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !isLocalUpload(frame.attribs.src),
};

export function isLocalUpload(src) {
  return typeof src === 'string' && src.startsWith('/uploads/') && !src.includes('..') && !src.includes('//');
}

export function sanitizeContent(html) {
  if (!html) return '';
  return sanitizeHtml(String(html), OPTIONS).trim();
}

/** Estrae i percorsi /uploads/... delle immagini presenti nel contenuto. */
export function extractUploadPaths(html) {
  const out = new Set();
  const re = /<img\b[^>]*\bsrc="(\/uploads\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html || ''))) out.add(m[1]);
  return [...out];
}
