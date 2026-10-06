import { StatusMessage } from './status';

export default {
  Danger: <StatusMessage tone="danger">That invite code is invalid, already used or expired.</StatusMessage>,
  Success: <StatusMessage tone="success">Saved.</StatusMessage>,
  Info: <StatusMessage tone="info">Next feed due in 42m.</StatusMessage>,
};
