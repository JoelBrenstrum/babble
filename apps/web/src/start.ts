import { createStart } from '@tanstack/react-start';

// Auth lives in browser storage, so pages render on the client; the server only renders the document shell.
export const startInstance = createStart(() => ({ defaultSsr: false }));
