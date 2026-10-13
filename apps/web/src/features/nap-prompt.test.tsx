import type { BabbleClient } from '@babble/api';
import { NotifyProvider } from '@babble/api/react';
import { sampleRunningSleep } from '@babble/api/fixtures';
import type { NapPrompt } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { NapPromptProvider, useNapPrompt } from './nap-prompt';

const rpc = vi.fn();
const notify = vi.fn();
const client = { rpc } as unknown as BabbleClient;

function Trigger({ prompt }: { prompt: NapPrompt }) {
  const show = useNapPrompt();
  return <button onClick={() => show(prompt)}>Ask</button>;
}

async function renderPrompt(prompt: NapPrompt) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotifyProvider notify={notify}>
        <FixtureRouter>
          <NapPromptProvider client={client} babyId="baby-1" babyName="Ada" timeZone="UTC">
            <Trigger prompt={prompt} />
          </NapPromptProvider>
        </FixtureRouter>
      </NotifyProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Ask' }));
}

const endNap = (): NapPrompt => {
  const nap = sampleRunningSleep(new Date());
  return { kind: 'end-nap', nap, feedStartedAt: nap.startedAt };
};

describe('NapPromptProvider', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: null, error: null });
    notify.mockReset();
  });

  it('asks the question as a modal dialog and closes without acting on Escape', async () => {
    await renderPrompt({ kind: 'nappy', at: new Date().toISOString() });
    expect(screen.getByRole('dialog', { name: "Change Ada's nappy?" })).toHaveAttribute('aria-modal', 'true');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('runs the chosen action, then closes', async () => {
    await renderPrompt(endNap());
    await userEvent.click(screen.getByRole('button', { name: 'End nap now' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(rpc).toHaveBeenCalledWith('end_session', expect.objectContaining({ target_event_id: expect.any(String) }));
  });

  it('stays open and tells you once when the action fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' } });
    await renderPrompt(endNap());
    await userEvent.click(screen.getByRole('button', { name: 'End nap now' }));
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End nap now' })).toBeEnabled();
  });

  it('dismisses with the quiet option', async () => {
    await renderPrompt(endNap());
    await userEvent.click(screen.getByRole('button', { name: 'Keep sleeping' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });
});
