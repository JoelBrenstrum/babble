import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { EXAMPLES, HOME_ASSISTANT_REPO_URL } from './examples';
import { HomeAssistantPage } from './home-assistant-page';

async function renderPage(billingEnabled = false) {
  render(
    <FixtureRouter>
      <HomeAssistantPage serverUrl="https://babble.example" billingEnabled={billingEnabled} />
    </FixtureRouter>,
  );
  return screen.findByRole('heading', { level: 1, name: 'babble for Home Assistant' });
}

describe('HomeAssistantPage', () => {
  it('explains setup with this server and the integration repository', async () => {
    await renderPage();
    expect(screen.getByText('https://babble.example')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: HOME_ASSISTANT_REPO_URL.replace('https://', '') })).toHaveAttribute(
      'href',
      HOME_ASSISTANT_REPO_URL,
    );
    expect(screen.getByText(/Signed-in devices/)).toBeInTheDocument();
  });

  it('shows each example, including the doorbell automation', async () => {
    await renderPage();
    for (const example of EXAMPLES) {
      expect(screen.getByRole('heading', { level: 3, name: example.title })).toBeInTheDocument();
    }
    const code = Array.from(document.querySelectorAll('pre code'), (block) => block.textContent);
    expect(code).toEqual(EXAMPLES.map((example) => example.yaml));
    expect(code[0]).toContain('switch.front_door_chime');
  });

  it('copies an example', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]!);
    expect(writeText).toHaveBeenCalledWith(EXAMPLES[0]!.yaml);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('mentions Plus for predictions only when billing is on', async () => {
    await renderPage();
    expect(screen.queryByText(/Predicted naps and feeds need/)).toBeNull();
  });

  it('marks predictions as Plus when billing is on', async () => {
    await renderPage(true);
    expect(screen.getByText(/Predicted naps and feeds need/)).toHaveTextContent('Plus');
  });
});
