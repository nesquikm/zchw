import { cn } from '../../lib/cn';

interface ModelFilterProps {
  models: string[];
  selected: string[];
  onChange: (models: string[]) => void;
}

export function ModelFilter({ models, selected, onChange }: ModelFilterProps) {
  const toggle = (model: string) => {
    if (selected.includes(model)) {
      onChange(selected.filter((m) => m !== model));
    } else {
      onChange([...selected, model]);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-zinc-500">Models:</span>
      <button
        className={cn(
          'rounded-md px-2 py-1 text-sm transition-colors',
          selected.length === 0
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
        )}
        onClick={() => onChange([])}
      >
        All
      </button>
      {models.map((model) => (
        <button
          key={model}
          className={cn(
            'rounded-md px-2 py-1 text-sm transition-colors',
            selected.includes(model)
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          )}
          onClick={() => toggle(model)}
        >
          {model}
        </button>
      ))}
    </div>
  );
}
