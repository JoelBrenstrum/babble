import { POO_COLOUR_LABELS, type PooColour } from '@babble/domain';
import { lightVars } from '@babble/tokens';
import Svg, { Circle, ClipPath, Defs, Polygon } from 'react-native-svg';
import { labelOptions } from '@/lib/options';

const TOKENS: Record<PooColour, keyof typeof lightVars> = {
  yellow: '--poo-yellow',
  mustard: '--poo-mustard',
  green: '--poo-green',
  dark_green: '--poo-dark-green',
  brown: '--poo-brown',
  orange: '--poo-orange',
  black: '--poo-black',
  red: '--poo-red',
  white_grey: '--poo-white-grey',
};

export const POO_COLOURS = labelOptions(POO_COLOUR_LABELS, Object.keys(TOKENS) as PooColour[]);

function pooColor(colour: PooColour): string {
  return `rgb(${lightVars[TOKENS[colour]].replaceAll(' ', ',')})`;
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
