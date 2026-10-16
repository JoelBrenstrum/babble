import { shownLanes, TIMELINE_LANE_LABELS, TIMELINE_LANES, toggleLane, type TimelineLane } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';

const DOT: Record<TimelineLane, string> = {
  sleep: 'bg-sleep',
  feeds: 'bg-feed-left',
  nappies: 'bg-nappy',
  pumps: 'bg-pump',
};

export function LaneToggles({
  show,
  onChange,
}: {
  show: string | undefined;
  onChange: (show: string | undefined) => void;
}) {
  const shown = shownLanes(show);
  return (
    <View accessibilityLabel="Show on the timeline" className="flex-row flex-wrap gap-2">
      {TIMELINE_LANES.map((lane) => {
        const on = shown.includes(lane);
        const last = on && shown.length === 1;
        return (
          <Pressable
            key={lane}
            accessibilityRole="switch"
            accessibilityLabel={TIMELINE_LANE_LABELS[lane]}
            accessibilityState={{ checked: on, disabled: last }}
            disabled={last}
            onPress={() => onChange(toggleLane(show, lane))}
            className={`h-10 flex-row items-center gap-2 rounded-full border px-3 ${on ? 'border-line-strong bg-raised' : 'border-line bg-surface'}`}
          >
            <View className={`h-2.5 w-2.5 rounded-full ${on ? DOT[lane] : 'bg-line-strong'}`} />
            <Text className={`font-semibold text-label ${on ? 'text-ink' : 'text-ink-3'}`}>
              {TIMELINE_LANE_LABELS[lane]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
