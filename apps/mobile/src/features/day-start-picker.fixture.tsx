import { useValue } from 'react-cosmos/client';
import { DayStartPicker } from './day-start-picker';

function Picker({ initial }: { initial: number }) {
  const [minutes, setMinutes] = useValue('minutes', { defaultValue: initial });
  return <DayStartPicker value={minutes} onChange={setMinutes} />;
}

export default {
  Midnight: <Picker initial={0} />,
  'Custom 7:00 am': <Picker initial={420} />,
};
