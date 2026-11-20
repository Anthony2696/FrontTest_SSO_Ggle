import { useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyButton({
  value,
  label = 'Copiar detalles',
  copiedLabel = 'Detalles copiados',
  className = 'button button--ghost button--small',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? copiedLabel : label}
    </button>
  );
}
