import { useId } from 'react';
import { CircleHelp } from 'lucide-react';
import { GLOSSARY, type GlossaryKey } from '../../lib/glossary';

export interface InfoTooltipProps {
  glossaryKey?: GlossaryKey;
  text?: string;
  className?: string;
}

export function InfoTooltip({ glossaryKey, text, className = '' }: InfoTooltipProps) {
  const id = useId();
  const definition = text ?? (glossaryKey ? GLOSSARY[glossaryKey].definition : '');

  if (!definition) return null;

  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      <button
        type="button"
        className="inline-flex cursor-help text-zinc-400 hover:text-zinc-600 focus:text-zinc-600 focus:outline-none"
        aria-describedby={id}
        tabIndex={0}
      >
        <CircleHelp size={14} />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-md bg-zinc-800 px-3 py-2 text-xs leading-relaxed text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {definition}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
      </span>
    </span>
  );
}
