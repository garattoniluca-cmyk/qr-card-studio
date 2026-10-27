import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { buildExtensions, COMMANDS, normalizeLink } from './extensions.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

function ToolButton({ id, label, active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      data-cmd={id}
      title={label}
      aria-label={label}
      aria-pressed={active ? 'true' : 'false'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${active ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-700 hover:bg-white hover:shadow-sm'} ${className}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <div className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />;

/**
 * Editor rich text. `onUpload(file)` carica il file sul server e restituisce { url, ... };
 * nel contenuto finisce solo il percorso relativo /uploads/... restituito.
 */
export function RichTextEditor({ value, onChange, onUpload, onUploadError }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState('');
  const fileRef = useRef(null);
  const uploadRef = useRef(null);

  async function uploadAndInsert(files, editor, pos) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const media = await onUpload(file);
        const chain = editor.chain().focus();
        if (typeof pos === 'number') chain.insertContentAt(pos, { type: 'image', attrs: { src: media.url, alt: '' } });
        else chain.setImage({ src: media.url, alt: '' });
        chain.run();
      } catch (e) {
        onUploadError?.(e);
      }
    }
  }
  uploadRef.current = uploadAndInsert;

  const editor = useEditor({
    extensions: buildExtensions(),
    content: value || '',
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class:
          'rich-content min-h-[260px] max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm focus:outline-none focus-within:ring-2 focus-within:ring-indigo-500',
        'data-testid': 'rich-editor',
        'aria-label': 'Contenuto della scheda',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handlePaste(view, event) {
        const files = [...(event.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        uploadRef.current(files, editorRef.current);
        return true;
      },
      handleDrop(view, event, slice, moved) {
        if (moved) return false;
        const files = [...(event.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        uploadRef.current(files, editorRef.current, coords?.pos);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? '' : ed.getHTML()),
  });
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // Contenuto caricato dal server dopo il montaggio (apertura di una scheda esistente).
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if ((value || '') !== current) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  const st = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h1: e.isActive('heading', { level: 1 }),
            h2: e.isActive('heading', { level: 2 }),
            h3: e.isActive('heading', { level: 3 }),
            paragraph: e.isActive('paragraph'),
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            strike: e.isActive('strike'),
            alignLeft: e.isActive({ textAlign: 'left' }),
            alignCenter: e.isActive({ textAlign: 'center' }),
            alignRight: e.isActive({ textAlign: 'right' }),
            bulletList: e.isActive('bulletList'),
            orderedList: e.isActive('orderedList'),
            blockquote: e.isActive('blockquote'),
            link: e.isActive('link'),
            color: e.getAttributes('textStyle').color || '#1e293b',
          }
        : {},
  });

  if (!editor) return null;
  const run = (id, arg) => () => COMMANDS[id](editor, arg);

  function openLink() {
    setLinkValue(editor.getAttributes('link').href || '');
    setLinkError('');
    setLinkOpen(true);
  }
  function confirmLink(e) {
    e.preventDefault();
    if (!linkValue.trim()) {
      COMMANDS.link(editor, null);
      setLinkOpen(false);
      return;
    }
    const href = normalizeLink(linkValue);
    if (!href) {
      setLinkError('Indirizzo non valido: usa http, https o mailto.');
      return;
    }
    COMMANDS.link(editor, href);
    setLinkOpen(false);
  }

  return (
    <div className="space-y-3">
      <div role="toolbar" aria-label="Formattazione del testo" className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <ToolButton id="h1" label="Titolo grande (H1)" active={st.h1} onClick={run('h1')}>
          H1
        </ToolButton>
        <ToolButton id="h2" label="Sottotitolo (H2)" active={st.h2} onClick={run('h2')}>
          H2
        </ToolButton>
        <ToolButton id="h3" label="Titolo paragrafo (H3)" active={st.h3} onClick={run('h3')}>
          H3
        </ToolButton>
        <ToolButton id="paragraph" label="Paragrafo" active={st.paragraph && !st.h1} onClick={run('paragraph')} className="font-medium">
          Paragrafo
        </ToolButton>
        <Sep />
        <ToolButton id="bold" label="Grassetto" active={st.bold} onClick={run('bold')}>
          <Bold aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="italic" label="Corsivo" active={st.italic} onClick={run('italic')}>
          <Italic aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="underline" label="Sottolineato" active={st.underline} onClick={run('underline')}>
          <Underline aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="strike" label="Barrato" active={st.strike} onClick={run('strike')}>
          <Strikethrough aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <label
          title="Colore del testo"
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition hover:bg-white hover:shadow-sm"
        >
          <Palette aria-hidden="true" className="h-4 w-4" style={{ color: st.color }} />
          <input
            type="color"
            data-cmd="color"
            aria-label="Colore del testo"
            value={/^#[0-9a-f]{6}$/i.test(st.color) ? st.color : '#1e293b'}
            onChange={(e) => COMMANDS.color(editor, e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <Sep />
        <ToolButton id="alignLeft" label="Allinea a sinistra" active={st.alignLeft} onClick={run('alignLeft')}>
          <AlignLeft aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="alignCenter" label="Centra" active={st.alignCenter} onClick={run('alignCenter')}>
          <AlignCenter aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="alignRight" label="Allinea a destra" active={st.alignRight} onClick={run('alignRight')}>
          <AlignRight aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <Sep />
        <ToolButton id="bulletList" label="Elenco puntato" active={st.bulletList} onClick={run('bulletList')}>
          <List aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="orderedList" label="Elenco numerato" active={st.orderedList} onClick={run('orderedList')}>
          <ListOrdered aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <ToolButton id="blockquote" label="Citazione" active={st.blockquote} onClick={run('blockquote')}>
          <Quote aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
        <Sep />
        <ToolButton id="link" label="Collegamento" active={st.link} onClick={openLink} className="gap-1 font-medium">
          <Link2 aria-hidden="true" className="h-4 w-4" /> Link
        </ToolButton>
        <ToolButton id="image" label="Inserisci immagine" onClick={() => fileRef.current?.click()} className="gap-1 bg-indigo-50 font-semibold text-indigo-700">
          <ImagePlus aria-hidden="true" className="h-4 w-4" /> Immagine
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          data-testid="editor-image-input"
          className="hidden"
          onChange={(e) => {
            const files = [...e.target.files];
            e.target.value = '';
            uploadAndInsert(files, editor);
          }}
        />
        <ToolButton id="clear" label="Pulisci formattazione" onClick={run('clear')} className="ml-auto text-rose-600 hover:bg-rose-50">
          <Eraser aria-hidden="true" className="h-4 w-4" />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
      <p className="text-xs text-slate-400">Puoi anche trascinare o incollare un'immagine nel testo: viene caricata sul server.</p>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Inserisci collegamento"
        description="Lascia vuoto per rimuovere il collegamento dal testo selezionato."
      >
        <form onSubmit={confirmLink} className="space-y-4">
          <div>
            <label htmlFor="link-url" className="field-label">
              Indirizzo (http, https o mailto)
            </label>
            <input id="link-url" data-autofocus className="field" placeholder="https://…" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} />
            {linkError ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {linkError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" variant="soft" size="sm">
              Applica link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
