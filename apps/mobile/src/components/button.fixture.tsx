import { View } from 'react-native';
import { Button } from './button';

export default (
  <View className="gap-4">
    <Button size="lg">Start nap</Button>
    <Button variant="secondary">Pause</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Discard feed</Button>
    <Button disabled>Disabled</Button>
    <Button loading>Saving</Button>
  </View>
);
