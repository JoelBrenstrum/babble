import { describe, expect, it } from 'vitest';
import { possessive, settingsGroups } from './settings-groups';

describe('possessive', () => {
  it.each([
    ['Olivia', "Olivia's"],
    ['James', "James'"],
    ['GUS', "GUS'"],
  ])('%s → %s', (name, expected) => expect(possessive(name)).toBe(expected));
});

describe('settingsGroups', () => {
  it('orders baby, family, device, tools then account, naming the baby and family', () => {
    const groups = settingsGroups('Olivia', 'The Smiths');
    expect(groups.map((group) => group.id)).toEqual(['baby', 'family', 'device', 'tools', 'account']);
    expect(groups[0]).toMatchObject({ nav: 'Olivia', title: "Olivia's settings" });
    expect(groups[0]!.description).toContain('Olivia');
    expect(groups[1]!.description).toContain('The Smiths');
  });
});
