import { TRACKERS } from '@babble/domain';
import { Avatar } from './avatar';
import { TrackerIcon } from './tracker-icon';

export default {
  Trackers: (
    <div className="flex flex-col gap-3">
      {TRACKERS.map((tracker) => (
        <div key={tracker.key} className="flex items-center gap-3">
          <TrackerIcon tracker={tracker} />
          <span className="text-row-title font-semibold">{tracker.label}</span>
        </div>
      ))}
    </div>
  ),
  Avatars: (
    <div className="flex gap-2">
      <Avatar name="John" />
      <Avatar name="Jane Smith" />
    </div>
  ),
};
