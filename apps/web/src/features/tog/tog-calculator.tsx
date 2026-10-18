import {
  appendKey,
  convertTemp,
  formatTempValue,
  formatTog,
  parseTypedTemp,
  parseTypedTog,
  roomForTog,
  SCALE_TICKS_C,
  scalePosition,
  stepTemp,
  stepTog,
  TEMP_LIMITS,
  tempUnitLabel,
  TOG_CHART,
  TOG_RATINGS,
  togForRoom,
  type TempUnit,
  type TogHintIcon,
  type TogMode,
  type TogResult,
} from '@babble/domain';
import {
  ArrowLeftRight,
  Delete,
  Info,
  Layers,
  Minus,
  Moon,
  Plus,
  Shirt,
  Snowflake,
  Sun,
  Tag,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '#/lib/cn';

const HINT_ICONS: Record<TogHintIcon, LucideIcon> = {
  edge: ArrowLeftRight,
  'all-season': Layers,
  brand: Tag,
  clamp: Info,
};

const MODES: { value: TogMode; label: string; icon: LucideIcon }[] = [
  { value: 'room', label: 'Room temp → TOG', icon: Thermometer },
  { value: 'bag', label: 'Bag TOG → room temp', icon: Moon },
];

const UNITS: { value: TempUnit; label: string }[] = [
  { value: 'c', label: '°C' },
  { value: 'f', label: '°F' },
];

const SCALE_SEGMENTS = [
  { tog: 3.5, bg: 'bg-sleep text-ink-on-solid' },
  { tog: 2.5, bg: 'bg-sleep/70 text-ink-on-solid' },
  { tog: 1.0, bg: 'bg-sleep/40 text-on-sleep' },
  { tog: 0.2, bg: 'bg-sleep/20 text-on-sleep' },
];

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export interface TogState {
  mode: TogMode;
  unit: TempUnit;
  temp: number;
  tog: number;
}

export const DEFAULT_TOG_STATE: TogState = { mode: 'room', unit: 'c', temp: 22, tog: 2.5 };

function Keypad({
  label,
  unit,
  onDone,
  onCancel,
}: {
  label: string;
  unit: string;
  onDone: (typed: string) => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  return (
    <div
      role="dialog"
      aria-label={`Type the ${label.toLowerCase()}`}
      className="absolute inset-x-3 top-[7.5rem] z-10 flex flex-col gap-3 rounded-card border border-line-strong bg-raised p-4 shadow-toast"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-body font-bold">{label}</span>
        <span aria-live="polite" className="tabular text-timer-md font-semibold">
          {typed || '–'}
          <span className="ml-1 text-body text-ink-2">{unit}</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === 'del' ? 'Delete' : key}
            onClick={() => setTyped((current) => appendKey(current, key))}
            className="grid h-13 place-items-center rounded-button bg-surface text-heading font-semibold active:bg-sleep-soft"
          >
            {key === 'del' ? <Delete className="size-5" strokeWidth={2.5} /> : key}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-tap flex-1 rounded-button text-body font-semibold text-on-primary-soft hover:bg-primary-soft"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onDone(typed)}
          className="h-tap flex-1 rounded-button bg-primary text-body font-semibold text-on-primary"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-12 items-center justify-center gap-2 rounded-tile px-2.5 py-1.5 text-center text-label transition-colors duration-base',
        selected ? 'bg-raised font-bold text-ink shadow-raised' : 'font-medium text-ink-2',
      )}
    >
      {children}
    </button>
  );
}

function ResultCard({ result }: { result: TogResult }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-3.5 rounded-card bg-sleep-soft p-5 text-on-sleep">
      <span className="text-label font-bold uppercase tracking-[0.06em]">{result.kicker}</span>
      <div className="flex flex-col gap-0.5">
        <span className="tabular text-[40px] font-bold leading-[1.05] text-ink sm:text-[56px]">{result.head}</span>
        <span className="text-body font-semibold">{result.sub}</span>
        <span className="tabular text-meta text-ink-3">{result.other}</span>
      </div>
      {result.hints.map((hint) => {
        const Icon = HINT_ICONS[hint.icon];
        return (
          <div key={hint.icon} className="flex items-start gap-2.5 rounded-tile bg-raised/70 px-3 py-2.5 text-ink">
            <Icon className="mt-0.5 size-4 shrink-0 text-sleep" strokeWidth={2.75} />
            <span className="text-label leading-[1.45]">{hint.text}</span>
          </div>
        );
      })}
      <div className="flex items-start gap-3 border-t border-sleep/30 pt-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-sleep">
          <Shirt className="size-5" strokeWidth={2.5} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-label font-bold">Under the bag</span>
          <span className="text-body leading-[1.4] text-ink">{result.layers}</span>
        </div>
      </div>
      {result.outside.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-sleep/30 pt-3">
          <span className="text-label font-bold">If the room is outside this</span>
          {result.outside.map((row) => {
            const Icon = row.icon === 'sun' ? Sun : Snowflake;
            return (
              <div key={row.icon} className="flex items-start gap-2.5 text-label leading-[1.45] text-ink">
                <Icon className="mt-0.5 size-4 shrink-0 text-sleep" strokeWidth={2.75} />
                <span>
                  <b>{row.when}</b> {row.what}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Scale({ result, unit }: { result: TogResult; unit: TempUnit }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      <div className="relative h-[30px]">
        {result.marker && (
          <div
            className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${result.marker.position}%` }}
          >
            <span className="tabular flex h-[22px] items-center whitespace-nowrap rounded-chip bg-ink px-2 text-[12px] font-bold text-bg">
              {result.marker.label}
            </span>
            <span className="size-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-ink" />
          </div>
        )}
      </div>
      <div className="relative flex h-12 overflow-hidden rounded-chip">
        {SCALE_SEGMENTS.map((segment) => (
          <div
            key={segment.tog}
            className={cn(
              'tabular grid flex-1 place-items-center text-meta font-bold',
              segment.bg,
              result.marker && result.activeTogs.includes(segment.tog) && 'shadow-[inset_0_0_0_3px_rgb(var(--raised))]',
            )}
          >
            {formatTog(segment.tog)}
          </div>
        ))}
        {result.bracket && (
          <span
            className="absolute inset-y-[3px] rounded-chip border-[3px] border-ink"
            style={{ left: `${result.bracket.from}%`, width: `${result.bracket.to - result.bracket.from}%` }}
          />
        )}
      </div>
      <div className="tabular relative h-[18px] text-meta text-ink-2">
        {SCALE_TICKS_C.map((celsius) => (
          <span key={celsius} className="absolute -translate-x-1/2" style={{ left: `${scalePosition(celsius)}%` }}>
            {formatTempValue(convertTemp(celsius, 'c', unit), unit)}°
          </span>
        ))}
      </div>
    </div>
  );
}

export function TogChart({ activeTogs }: { activeTogs: readonly number[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-raised" role="table" aria-label="TOG chart">
      {TOG_CHART.map((row, index) => {
        const active = activeTogs.includes(row.tog);
        return (
          <div
            key={row.tog}
            role="row"
            className={cn(
              'flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4.5 py-3.5',
              index > 0 && 'border-t border-line',
              active && 'bg-sleep-soft',
            )}
          >
            <span role="cell" className="tabular flex-[1_1_200px] text-body font-semibold">
              {formatRowTemp(row.lo, row.hi, 'c')}
              <span className="ml-2 font-normal text-ink-3">{formatRowTemp(row.lo, row.hi, 'f')}</span>
            </span>
            <span
              role="cell"
              className={cn(
                'tabular flex h-8 w-21 shrink-0 items-center justify-center rounded-chip text-label font-bold',
                active ? 'bg-sleep text-ink-on-solid' : 'bg-surface text-ink',
              )}
            >
              {formatTog(row.tog)} TOG
            </span>
            <span role="cell" className="flex-[2_1_280px] text-label leading-[1.45] text-ink-2">
              {row.layers}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatRowTemp(lo: number, hi: number, unit: TempUnit): string {
  const edge = (celsius: number) => formatTempValue(convertTemp(celsius, 'c', unit), unit);
  const label = tempUnitLabel(unit);
  if (lo === -Infinity) return unit === 'c' ? `Below ${edge(hi)} ${label}` : `below ${edge(hi)} ${label}`;
  if (hi === Infinity) return unit === 'c' ? `${edge(lo)} ${label} and above` : `${edge(lo)} ${label}+`;
  return `${edge(lo)}–${edge(hi)} ${label}`;
}

export function TogCalculator({ initial = DEFAULT_TOG_STATE }: { initial?: TogState }) {
  const [state, setState] = useState(initial);
  const [padOpen, setPadOpen] = useState(false);
  const isRoom = state.mode === 'room';
  const result = isRoom ? togForRoom(state.temp, state.unit) : roomForTog(state.tog, state.unit);

  const unitLabel = tempUnitLabel(state.unit);
  const inputLabel = isRoom ? 'Room temperature' : 'Bag TOG';
  const valueText = isRoom ? formatTempValue(state.temp, state.unit) : formatTog(state.tog);
  const valueUnit = isRoom ? unitLabel : 'TOG';
  const stepHint = isRoom
    ? `Steps of ${TEMP_LIMITS[state.unit].step} ${unitLabel} · tap the number to type it`
    : 'Tap the number to type it';

  const update = (patch: Partial<TogState>) => setState((current) => ({ ...current, ...patch }));
  const step = (direction: 1 | -1) =>
    update(isRoom ? { temp: stepTemp(state.temp, state.unit, direction) } : { tog: stepTog(state.tog, direction) });
  const pickUnit = (unit: TempUnit) => {
    if (unit !== state.unit) update({ unit, temp: convertTemp(state.temp, state.unit, unit) });
  };
  const finishTyping = (typed: string) => {
    setPadOpen(false);
    if (isRoom) {
      const temp = parseTypedTemp(typed, state.unit);
      if (temp !== null) update({ temp });
    } else {
      const tog = parseTypedTog(typed);
      if (tog !== null) update({ tog });
    }
  };

  return (
    <>
      <section aria-label="TOG calculator" className="flex flex-col gap-5 rounded-sheet bg-surface p-4 sm:p-6 lg:p-8">
        <div
          role="radiogroup"
          aria-label="Direction"
          className="grid max-w-xl grid-cols-2 gap-1 rounded-card bg-bg p-1"
        >
          {MODES.map((mode) => (
            <SegmentButton
              key={mode.value}
              selected={state.mode === mode.value}
              onClick={() => {
                setPadOpen(false);
                update({ mode: mode.value });
              }}
            >
              <mode.icon className="size-4 shrink-0" strokeWidth={2.75} />
              {mode.label}
            </SegmentButton>
          ))}
        </div>

        <div className="grid items-stretch gap-5 md:grid-cols-2">
          <div className="relative flex flex-col gap-4 rounded-card border border-line bg-raised p-5 shadow-raised">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex-1 text-body font-bold">{inputLabel}</span>
              <div
                role="radiogroup"
                aria-label="Temperature unit"
                className="flex gap-0.5 rounded-tile bg-surface p-[3px]"
              >
                {UNITS.map((unit) => (
                  <button
                    key={unit.value}
                    type="button"
                    role="radio"
                    aria-checked={state.unit === unit.value}
                    onClick={() => pickUnit(unit.value)}
                    className={cn(
                      'grid h-9.5 min-w-13 place-items-center rounded-[9px] text-meta transition-colors duration-base',
                      state.unit === unit.value
                        ? 'bg-raised font-bold text-ink shadow-raised'
                        : 'font-medium text-ink-2',
                    )}
                  >
                    {unit.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Decrease ${inputLabel.toLowerCase()}`}
                onClick={() => step(-1)}
                className="grid size-14 shrink-0 place-items-center rounded-full bg-surface hover:bg-sleep-soft"
              >
                <Minus className="size-[22px]" strokeWidth={2.75} />
              </button>
              <button
                type="button"
                aria-label={`${inputLabel}: ${valueText} ${valueUnit}. Tap to type a value`}
                onClick={() => setPadOpen(true)}
                className={cn(
                  'flex h-18 min-w-0 flex-1 items-baseline justify-center gap-1.5 rounded-card border pt-3 hover:bg-surface',
                  padOpen ? 'border-2 border-primary' : 'border-line',
                )}
              >
                <span className="tabular text-[44px] font-semibold leading-none">{valueText}</span>
                <span className="text-heading font-semibold text-ink-2">{valueUnit}</span>
              </button>
              <button
                type="button"
                aria-label={`Increase ${inputLabel.toLowerCase()}`}
                onClick={() => step(1)}
                className="grid size-14 shrink-0 place-items-center rounded-full bg-surface hover:bg-sleep-soft"
              >
                <Plus className="size-[22px]" strokeWidth={2.75} />
              </button>
            </div>
            <span className="text-center text-[13px] text-ink-3">{stepHint}</span>
            {!isRoom && (
              <div className="flex flex-col gap-2">
                <span className="text-label text-ink-2">Common ratings</span>
                <div role="radiogroup" aria-label="Common ratings" className="flex flex-wrap gap-2">
                  {TOG_RATINGS.map((rating) => {
                    const selected = state.tog === rating;
                    return (
                      <button
                        key={rating}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update({ tog: rating })}
                        className={cn(
                          'tabular flex h-11 min-w-14 items-center justify-center rounded-chip border-[1.5px] px-3 text-label font-semibold',
                          selected ? 'border-sleep bg-sleep text-ink-on-solid' : 'border-line bg-raised text-ink',
                        )}
                      >
                        {formatTog(rating)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {padOpen && (
              <Keypad label={inputLabel} unit={valueUnit} onDone={finishTyping} onCancel={() => setPadOpen(false)} />
            )}
          </div>
          <ResultCard result={result} />
        </div>

        <Scale result={result} unit={state.unit} />
      </section>
      <section aria-labelledby="tog-chart-heading" className="flex flex-col gap-4">
        <h2 id="tog-chart-heading" className="text-title font-bold">
          The chart
        </h2>
        <TogChart activeTogs={result.activeTogs} />
        <span className="text-meta text-ink-3">
          Brands rate their bags slightly differently. If the label has its own temperature guide, follow that.
        </span>
      </section>
    </>
  );
}
