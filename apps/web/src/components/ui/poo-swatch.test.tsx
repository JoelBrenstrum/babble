import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { POO_COLOURS, pooColour, PooSwatch, swatchBackground } from './poo-swatch';

describe('pooColour', () => {
  it('looks up the label and token for a colour', () => {
    expect(pooColour('white_grey')).toEqual({ label: 'White / grey', token: 'white-grey' });
  });

  it('lists every colour in picker order', () => {
    expect(POO_COLOURS.map((colour) => colour.value)).toEqual([
      'yellow',
      'mustard',
      'green',
      'dark_green',
      'brown',
      'orange',
      'black',
      'red',
      'white_grey',
    ]);
  });
});

describe('swatchBackground', () => {
  it('is transparent, a single colour or a split between two', () => {
    expect(swatchBackground([])).toBe('transparent');
    expect(swatchBackground(['brown'])).toBe('rgb(var(--poo-brown))');
    expect(swatchBackground(['yellow', 'dark_green'])).toBe(
      'linear-gradient(135deg, rgb(var(--poo-yellow)) 50%, rgb(var(--poo-dark-green)) 50%)',
    );
  });
});

describe('PooSwatch', () => {
  it('names the colours it shows', () => {
    render(<PooSwatch colours={['mustard', 'red']} />);
    expect(screen.getByRole('img', { name: 'Mustard and Red' })).toBeInTheDocument();
  });

  it('renders nothing without colours', () => {
    const { container } = render(<PooSwatch colours={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
