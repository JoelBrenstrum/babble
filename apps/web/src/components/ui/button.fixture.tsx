import { Plus, Trash2 } from 'lucide-react';
import { Button } from './button';

export default {
  Variants: (
    <div className="flex flex-col items-start gap-4">
      <Button size="lg">Start nap</Button>
      <Button variant="secondary">Pause</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">
        <Trash2 className="size-5" strokeWidth={2.75} />
        Discard feed
      </Button>
      <Button disabled>Disabled</Button>
      <Button size="icon" variant="secondary" aria-label="Add">
        <Plus className="size-5" strokeWidth={2.75} />
      </Button>
    </div>
  ),
};
