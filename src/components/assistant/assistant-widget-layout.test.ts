import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const component = readFileSync(join(root, 'src/components/assistant/AiAssistantWidget.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/components/assistant/AiAssistantWidget.module.css'), 'utf8');

describe('assistant widget layout', () => {
  it('keeps conversations in a dedicated left rail', () => {
    expect(component).toContain('styles.conversationRail');
    expect(css).toContain('.conversationRail');
    expect(css).toContain('grid-template-columns: 128px minmax(0, 1fr)');
  });

  it('left-aligns all chat records instead of placing user records on the right', () => {
    expect(css).toContain('.user { justify-self: start;');
    expect(css).not.toContain('.user { justify-self: end;');
  });
});
