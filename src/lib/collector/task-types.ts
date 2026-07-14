export const ACTIVE_TASK_STATUSES = ['QUEUED', 'RUNNING', 'PAUSED'] as const;

export type CollectTaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type CollectTaskMode = 'initial-100' | 'full';

export function isTerminalTaskStatus(status: CollectTaskStatus) {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED';
}
