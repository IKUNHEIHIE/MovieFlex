import { describe, expect, it } from 'vitest';
import {
  getOpenIssueCount,
  getStartOfToday,
  getTaskProgressLabel,
  getTaskTone,
} from './overview-data';

describe('admin overview data helpers', () => {
  it('counts all open operation issues', () => {
    expect(getOpenIssueCount({
      pendingMappings: 3,
      pendingOutboxEvents: 2,
      failedTasks: 1,
      neverSyncedSources: 4,
    })).toBe(10);
  });

  it('maps task status to a visual tone', () => {
    expect(getTaskTone('FAILED')).toBe('danger');
    expect(getTaskTone('RUNNING')).toBe('warning');
    expect(getTaskTone('PAUSED')).toBe('warning');
    expect(getTaskTone('SUCCEEDED')).toBe('normal');
    expect(getTaskTone(null)).toBe('normal');
  });

  it('formats task progress with a safe fallback', () => {
    expect(getTaskProgressLabel({ pagesProcessed: 3, totalPages: 10 })).toBe('3 / 10 页');
    expect(getTaskProgressLabel({ pagesProcessed: 0, totalPages: 0 })).toBe('暂无分页进度');
  });

  it('returns the local start of the provided day', () => {
    const start = getStartOfToday(new Date('2026-07-15T20:33:55.000Z'));

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});
