import { cn } from '../../lib/cn';
import type { DateRangePreset } from '../../lib/constants';

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'custom'];

interface DateRangePickerProps {
  value: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  onChange: (preset: DateRangePreset, custom?: { from: string; to: string }) => void;
}

export function DateRangePicker({ value, customFrom, customTo, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            role="button"
            data-active={value === preset ? 'true' : 'false'}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              value === preset
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            )}
            onClick={() => onChange(preset, preset === 'custom' ? undefined : undefined)}
          >
            {preset === 'custom' ? 'Custom' : preset}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <span>From</span>
            <input
              type="date"
              aria-label="From"
              value={customFrom ?? ''}
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
              onChange={(e) =>
                onChange('custom', {
                  from: e.target.value,
                  to: customTo ?? '',
                })
              }
            />
          </label>
          <label className="flex items-center gap-1 text-sm">
            <span>To</span>
            <input
              type="date"
              aria-label="To"
              value={customTo ?? ''}
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
              onChange={(e) =>
                onChange('custom', {
                  from: customFrom ?? '',
                  to: e.target.value,
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}
