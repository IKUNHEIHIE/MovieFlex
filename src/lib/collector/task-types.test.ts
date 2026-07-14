import { expect, it } from 'vitest';
import { ACTIVE_TASK_STATUSES, isTerminalTaskStatus } from './task-types';

it('treats queued and running work as active but completed work as terminal', () => {
  expect(ACTIVE_TASK_STATUSES).toEqual(['QUEUED', 'RUNNING', 'PAUSED']);
  expect(isTerminalTaskStatus('SUCCEEDED')).toBe(true);
  expect(isTerminalTaskStatus('FAILED')).toBe(true);
  expect(isTerminalTaskStatus('RUNNING')).toBe(false);
});
