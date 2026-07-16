# Viewing Assistant Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename user-visible references to the Furina assistant as `观影小助手` while preserving internal component names and asset paths.

**Architecture:** This is a copy-only change. Keep `FurinaMascot`, `furina-mascot`, and `/mascot/furina/...` unchanged; update only user-facing labels, assistant persona copy, and contract tests.

**Tech Stack:** Next.js App Router, React, Vitest, TypeScript.

## Global Constraints

- Do not rename files, components, imports, storage keys, or image paths.
- Replace user-visible `芙宁娜` / `芙宁娜 AI 助手` with `观影小助手`.
- Keep generic `AI 助手` labels where they describe module/function areas rather than the mascot persona.
- Verify with focused contract tests, full Vitest suite, production Webpack build, and 3070 preview smoke test.

---

### Task 1: User-Visible Assistant Copy

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/components/assistant/AiAssistantWidget.tsx`
- Modify: `src/app/user/assistant/page.tsx`
- Modify: `src/lib/assistant-provider.ts`

**Interfaces:**
- Consumes: Existing assistant widget and history page strings.
- Produces: User-visible assistant name `观影小助手`.

- [ ] **Step 1: Write the failing test**

Add assertions to `src/app/home-anime-contract.test.ts`:

```ts
const assistantWidget = readFileSync(join(root, 'src/components/assistant/AiAssistantWidget.tsx'), 'utf8');
const assistantPage = readFileSync(join(root, 'src/app/user/assistant/page.tsx'), 'utf8');
const assistantProvider = readFileSync(join(root, 'src/lib/assistant-provider.ts'), 'utf8');

it('uses 观影小助手 as the user-visible assistant persona', () => {
  expect(assistantWidget).toContain('观影小助手');
  expect(assistantPage).toContain('观影小助手');
  expect(assistantProvider).toContain('名字是观影小助手');
  expect(assistantWidget).not.toContain('芙宁娜');
  expect(assistantPage).not.toContain('芙宁娜');
  expect(assistantProvider).not.toContain('名字是芙宁娜');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because existing files still contain `芙宁娜`.

- [ ] **Step 3: Write minimal implementation**

Update only user-visible strings:

```tsx
aria-label="观影小助手"
<strong>观影小助手</strong>
aria-label="点击打开观影小助手，长按后可拖动"
<strong>{message.role === 'user' ? '我' : '观影小助手'}</strong>
还没有 AI 对话。点击右下角观影小助手开始提问吧。
你是 MovieFlex 网站里的影视 AI 助手，名字是观影小助手。
```

- [ ] **Step 4: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test -- --run && npx next build --webpack`

Expected: all tests pass and build exits 0.

- [ ] **Step 6: Refresh preview and smoke test**

Run: `pm2 restart movieflex-home-preview --update-env && curl -I --max-time 5 http://127.0.0.1:3070/`

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/components/assistant/AiAssistantWidget.tsx src/app/user/assistant/page.tsx src/lib/assistant-provider.ts docs/superpowers/plans/2026-07-16-viewing-assistant-rename.md
git commit -m "fix: rename assistant persona copy"
```

Expected: one commit containing only the copy-only rename and plan.

## Self-Review

- Spec coverage: plan covers widget title, widget aria labels, assistant history page, empty state, and AI persona prompt.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: no API/type changes; internal `Furina` names remain unchanged.
