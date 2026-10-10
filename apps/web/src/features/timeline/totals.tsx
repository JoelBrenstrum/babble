import { weekdayLabel, type StripItem, type TotalCard, type TotalKey, type WeekRow } from '@babble/domain';
import { Carrot, Droplets, GlassWater, Heart, Moon, type LucideIcon } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { PooSwatch } from '#/components/ui/poo-swatch';
import { cn } from '#/lib/cn';

const TONES: Record<TotalKey, { icon: LucideIcon; tile: string }> = {
  sleep: { icon: Moon, tile: 'bg-sleep-soft text-on-sleep' },
  feeds: { icon: Heart, tile: 'bg-feed-right-soft text-on-feed-right' },
  solids: { icon: Carrot, tile: 'bg-solids-soft text-on-solids' },
  nappies: { icon: Droplets, tile: 'bg-nappy-soft text-on-nappy' },
  pump: { icon: GlassWater, tile: 'bg-pump-soft text-on-pump' },
};

const ROW_DOT: Record<WeekRow['key'], string> = {
  sleep: 'bg-sleep',
  longest: 'bg-sleep',
  feeds: 'bg-feed-right',
  left: 'bg-feed-left',
  right: 'bg-feed-right',
  idle: 'border border-dashed border-session-downtime',
  bottle: 'bg-bottle',
  solids: 'bg-solids',
  nappies: 'bg-nappy',
  pump: 'bg-pump',
};

export function SummaryStrip({ items, className }: { items: StripItem[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 divide-x divide-line rounded-card bg-surface py-2.5', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col px-3">
          <span className="text-meta text-ink-2">{item.label}</span>
          <span className="flex items-center gap-1.5">
            <span className="tabular text-heading font-bold">{item.value}</span>
            {item.swatch && <PooSwatch colours={[item.swatch]} className="size-4" />}
          </span>
          {item.note && <span className="tabular text-caption text-ink-3">{item.note}</span>}
        </div>
      ))}
    </div>
  );
}

export function DayTotals({ cards }: { cards: TotalCard[] }) {
  return (
    <div className="flex flex-col gap-3">
      {cards.map((card) => {
        const tone = TONES[card.key];
        return (
          <Card key={card.key} className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className={cn('grid size-9 place-items-center rounded-full', tone.tile)}>
                <tone.icon className="size-4" strokeWidth={2.75} />
              </span>
              <span className="flex-1 text-row-title font-semibold">{card.label}</span>
              <span className="tabular text-heading font-bold">{card.value}</span>
            </div>
            <dl className={cn('grid gap-2', card.details.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
              {card.details.map((detail) => (
                <div key={detail.label} className="flex flex-col rounded-tile bg-surface px-3 py-2">
                  <dt className="text-caption text-ink-2">{detail.label}</dt>
                  <dd className="tabular text-label font-semibold">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        );
      })}
    </div>
  );
}

export function WeekTable({ dayKeys, rows }: { dayKeys: string[]; rows: WeekRow[] }) {
  return (
    <Card className="overflow-x-auto p-4">
      <table className="w-full min-w-[40rem] text-left">
        <thead>
          <tr className="text-meta text-ink-2">
            <th className="pb-2 font-semibold">Daily totals</th>
            {dayKeys.map((key) => {
              const { weekday, day } = weekdayLabel(key);
              return (
                <th key={key} className="pb-2 text-right font-semibold">
                  {weekday} {day}
                </th>
              );
            })}
            <th className="pb-2 text-right font-semibold">Avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="py-2 text-label font-semibold">
                <span className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-sm', ROW_DOT[row.key])} />
                  {row.label}
                </span>
              </th>
              {row.values.map((value, index) => (
                <td key={index} className="tabular py-2 text-right text-label text-ink-2">
                  {value ?? ''}
                </td>
              ))}
              <td className="tabular py-2 text-right text-label font-bold">{row.average}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
