import { View } from 'react-native';
import { StatusMessage } from './status-message';

export default (
  <View className="gap-3">
    <StatusMessage tone="danger">That invite code is invalid, already used or expired.</StatusMessage>
    <StatusMessage tone="success">Saved.</StatusMessage>
    <StatusMessage tone="info">Next feed due in 42m.</StatusMessage>
  </View>
);
