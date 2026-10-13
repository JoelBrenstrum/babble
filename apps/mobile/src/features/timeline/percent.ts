import { formatFraction } from '@babble/domain';

export const pct = (frac: number) => formatFraction(frac) as `${number}%`;
