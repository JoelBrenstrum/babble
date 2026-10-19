export type SettingsGroupId = 'baby' | 'family' | 'device' | 'tools' | 'account';

export interface SettingsGroup {
  id: SettingsGroupId;
  nav: string;
  title: string;
  description: string;
}

export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function settingsGroups(babyName: string, familyName: string): SettingsGroup[] {
  return [
    {
      id: 'baby',
      nav: babyName,
      title: `${possessive(babyName)} settings`,
      description: `These only change things for ${babyName}.`,
    },
    {
      id: 'family',
      nav: 'Family',
      title: 'Family',
      description: `Shared by everyone in ${familyName}, for every baby.`,
    },
    { id: 'device', nav: 'This device', title: 'This device', description: 'Only changes this device.' },
    { id: 'tools', nav: 'Tools', title: 'Tools', description: 'Handy extras that work without signing in.' },
    { id: 'account', nav: 'Account', title: 'Account', description: 'Your sign-in, wherever you use babble.' },
  ];
}
