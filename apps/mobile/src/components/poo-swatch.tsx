import type { PooColour } from '@babble/domain';
import { lightVars } from '@babble/tokens';
import Svg, { Circle, ClipPath, Defs, Polygon } from 'react-native-svg';

export const POO_COLOURS: { value: PooColour; label: string; token: keyof typeof lightVars }[] = [
  { value: 'yellow', label: 'Yellow', token: '--poo-yellow' },
  { value: 'mustard', label: 'Mustard', token: '--poo-mustard' },
  { value: 'green', label: 'Green', token: '--poo-green' },
  { value: 'dark_green', label: 'Dark green', token: '--poo-dark-green' },
  { value: 'brown', label: 'Brown', token: '--poo-brown' },
  { value: 'orange', label: 'Orange', token: '--poo-orange' },
  { value: 'black', label: 'Black', token: '--poo-black' },
  { value: 'red', label: 'Red', token: '--poo-red' },
  { value: 'white_grey', label: 'White / grey', token: '--poo-white-grey' },
];

export const CAUTION_COLOURS: readonly PooColour[] = ['red', 'black', 'white_grey'];

export function pooColor(colour: PooColour): string {
  const token = POO_COLOURS.find((c) => c.value === colour)!.token;
  return `rgb(${lightVars[token].replaceAll(' ', ',')})`;
}

export function PooSwatch({ colours, size = 16 }: { colours: readonly PooColour[]; size?: number }) {
  const [first, second] = colours;
  if (!first) return null;
  const edge = `rgba(${lightVars['--swatch-edge'].replaceAll(' ', ',')},0.6)`;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessibilityLabel={colours.join(' and ')}>
      <Defs>
        <ClipPath id="swatch">
          <Circle cx="10" cy="10" r="10" />
        </ClipPath>
      </Defs>
      <Circle cx="10" cy="10" r="10" fill={pooColor(first)} />
      {second && <Polygon points="20,0 20,20 0,20" fill={pooColor(second)} clipPath="url(#swatch)" />}
      <Circle cx="10" cy="10" r="9.25" fill="none" stroke={edge} strokeWidth="1.5" />
    </Svg>
  );
}
