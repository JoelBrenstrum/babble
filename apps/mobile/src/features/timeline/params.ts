import { parseTimelineLanes, TIMELINE_VIEWS, type TimelineView } from '@babble/domain';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type TimelineParams = { view?: string; date?: string; show?: string };

export interface TimelineState {
  view: TimelineView;
  date: string | null;
  show: string | undefined;
}

export function timelineState(params: TimelineParams): TimelineState {
  return {
    view: TIMELINE_VIEWS.find((view) => view === params.view) ?? 'day',
    date: params.date && DAY_KEY.test(params.date) ? params.date : null,
    show: parseTimelineLanes(params.show),
  };
}
