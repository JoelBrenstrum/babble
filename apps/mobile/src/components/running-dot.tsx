import type { RunningIndicator, Tracker } from '@babble/domain';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

const DOT: Record<Tracker['token'], string> = {
  'feed-right': 'bg-feed-right',
  sleep: 'bg-sleep',
  nappy: 'bg-nappy',
  bottle: 'bg-bottle',
  pump: 'bg-pump',
  growth: 'bg-growth',
  custom: 'bg-custom',
};

export function RunningDot({ indicator }: { indicator: RunningIndicator }) {
  const [first, second] = indicator.tokens;
  const pulse = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const animate = indicator.pulsing && !reduceMotion;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  return (
    <View testID="running-dot" pointerEvents="none" className="size-2.5 items-center justify-center">
      {animate && (
        <Animated.View
          className={`absolute size-2.5 rounded-full ${DOT[first!]}`}
          style={{
            opacity: pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2.4, 2.4] }) }],
          }}
        />
      )}
      <View className="size-2.5 flex-row overflow-hidden rounded-full">
        <View testID={`running-dot-${first}`} className={`h-full flex-1 ${DOT[first!]}`} />
        {second && <View testID={`running-dot-${second}`} className={`h-full flex-1 ${DOT[second]}`} />}
      </View>
    </View>
  );
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => subscription.remove();
  }, []);
  return reduce;
}
