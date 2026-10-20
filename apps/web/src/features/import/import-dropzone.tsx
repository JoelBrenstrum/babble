import { FileUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '#/lib/cn';

export function ImportDropzone({ fileName, onChoose }: { fileName: string | null; onChoose: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-raised px-6 py-10 text-center has-focus-visible:ring-2 has-focus-visible:ring-primary hover:border-primary',
        dragging && 'border-primary bg-primary-soft',
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer.files[0];
        if (dropped) onChoose(dropped);
      }}
    >
      <FileUp className="size-8 text-primary" strokeWidth={2.5} />
      <span className="text-body font-semibold">
        {dragging ? 'Drop to import' : (fileName ?? 'Choose a file or drop it here')}
      </span>
      <span className="text-meta text-ink-2">
        {fileName ? 'Choose or drop a different file' : 'babble export (.json) or Huckleberry export (.csv)'}
      </span>
      <input
        type="file"
        accept=".csv,text/csv,.json,application/json"
        className="sr-only"
        aria-label="File to import"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) onChoose(chosen);
        }}
      />
    </label>
  );
}
