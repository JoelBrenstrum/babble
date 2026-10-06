import { parsePublicConfig } from '@babble/config';
import { createServerFn } from '@tanstack/react-start';

export const getPublicConfig = createServerFn({ method: 'GET' }).handler(() => parsePublicConfig(process.env));
