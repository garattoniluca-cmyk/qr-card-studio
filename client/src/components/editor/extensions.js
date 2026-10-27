// Estensioni TipTap e comandi della toolbar (condivisi tra editor e test headless).
import StarterKit from '@tiptap/starter-kit';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ['mailto'],
        defaultProtocol: 'https',
        isAllowedUri: (url) => /^(https?:|mailto:)/i.test(url),
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    TextStyle,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: false }),
  ];
}

/** Validazione dei link inseriti dall'utente: solo http, https o mailto. */
export function normalizeLink(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  return /^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i.test(withProto) ? withProto : null;
}

/** Comandi della toolbar: id → funzione(editor, valore?) */
export const COMMANDS = {
  h1: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  h2: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  h3: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  paragraph: (e) => e.chain().focus().setParagraph().run(),
  bold: (e) => e.chain().focus().toggleBold().run(),
  italic: (e) => e.chain().focus().toggleItalic().run(),
  underline: (e) => e.chain().focus().toggleUnderline().run(),
  strike: (e) => e.chain().focus().toggleStrike().run(),
  color: (e, color) => e.chain().focus().setColor(color).run(),
  alignLeft: (e) => e.chain().focus().setTextAlign('left').run(),
  alignCenter: (e) => e.chain().focus().setTextAlign('center').run(),
  alignRight: (e) => e.chain().focus().setTextAlign('right').run(),
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  orderedList: (e) => e.chain().focus().toggleOrderedList().run(),
  blockquote: (e) => e.chain().focus().toggleBlockquote().run(),
  link: (e, href) => (href ? e.chain().focus().extendMarkRange('link').setLink({ href }).run() : e.chain().focus().extendMarkRange('link').unsetLink().run()),
  image: (e, attrs) => e.chain().focus().setImage(attrs).run(),
  clear: (e) => e.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run(),
};
