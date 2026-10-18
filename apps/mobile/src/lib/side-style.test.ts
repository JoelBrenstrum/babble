import { SIDE_STYLE, sideStyle } from './side-style';

describe('SIDE_STYLE', () => {
  it('gives each side its own colour classes and initial', () => {
    expect(SIDE_STYLE.left).toEqual({
      solid: 'bg-feed-left',
      soft: 'bg-feed-left-soft border border-feed-left/40',
      text: 'text-on-feed-left',
      letter: 'L',
    });
    expect(SIDE_STYLE.right.letter).toBe('R');
    expect(SIDE_STYLE.right.solid).toBe('bg-feed-right');
  });

  it('styles a part without a side like the right side', () => {
    expect(sideStyle(null)).toBe(SIDE_STYLE.right);
    expect(sideStyle('left')).toBe(SIDE_STYLE.left);
  });
});
