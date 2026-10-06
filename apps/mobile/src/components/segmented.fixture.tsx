import { useValue } from 'react-cosmos/client';
import { Segmented } from './segmented';

function NappyType() {
  const [value, setValue] = useValue<'wet' | 'dirty' | 'both' | 'dry'>('value', { defaultValue: 'both' });
  return (
    <Segmented
      value={value}
      onChange={setValue}
      options={[
        { value: 'wet', label: 'Wet' },
        { value: 'dirty', label: 'Dirty' },
        { value: 'both', label: 'Both' },
        { value: 'dry', label: 'Dry' },
      ]}
    />
  );
}

export default <NappyType />;
