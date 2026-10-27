import { useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

/** Campo di upload con anteprima e «Rimuovi» (copertina e sfondo). */
export function MediaField({ id, label, media, onUpload, onRemove, onError }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      onError?.(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2.5">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
          {media ? (
            <img data-testid={`${id}-preview`} src={media.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageUp aria-hidden="true" className="h-6 w-6 text-slate-300" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="soft" onClick={() => inputRef.current?.click()} disabled={busy} data-testid={`${id}-pick`}>
            {busy ? 'Caricamento…' : media ? 'Sostituisci' : 'Carica immagine'}
          </Button>
          {media ? (
            <Button size="sm" variant="danger-soft" icon={Trash2} onClick={onRemove} data-testid={`${id}-remove`}>
              Rimuovi
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          id={id}
          data-testid={`${id}-input`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onPick}
        />
      </div>
    </div>
  );
}
