const MAILPIT = 'http://127.0.0.1:54324';

interface MessageSummary {
  ID: string;
  To: { Address: string }[];
  Created: string;
}

export async function waitForMagicLink(email: string, since: Date, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await response.json()) as { messages: MessageSummary[] };
    const latest = messages.find((message) => new Date(message.Created) >= since);
    if (latest) {
      const detail = (await (await fetch(`${MAILPIT}/api/v1/message/${latest.ID}`)).json()) as {
        HTML: string;
        Text: string;
      };
      const link =
        /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(detail.HTML)?.[1] ??
        /(http\S*\/auth\/v1\/verify\S*)/.exec(detail.Text)?.[1];
      if (link) return link.replaceAll('&amp;', '&');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No magic link email for ${email}`);
}
