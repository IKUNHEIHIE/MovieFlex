# Compact Profile AI History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the personal-center AI assistant history to the bottom and make it a compact low-emphasis summary.

**Architecture:** Keep the existing server-rendered profile page and existing `AssistantHistoryPanel` component. Reorder the component usage, reduce the profile query limit from five to two conversations, remove the misleading AI count from the profile summary, and compact the panel with inline styles matching the current code style.

**Tech Stack:** Next.js App Router, React server component, plain React component, Prisma query, Vitest file-contract tests.

## Global Constraints

- Move the AI assistant history block to the bottom of `/user/profile`.
- Keep the profile overview, recently watched, favorites, and recommendations above it.
- Compact the AI history block so it no longer dominates the page.
- Preserve the link to `/user/assistant` for full history.
- Keep the AI conversation data query lightweight.
- No changes to `/user/assistant` full history page.
- No changes to assistant chat storage or API behavior.
- No changes to recommendation, favorite, or watch-history logic.
- No new styling library.
- The profile summary should not show a misleading AI conversation count.

---

## File Structure

- Modify `src/app/home-anime-contract.test.ts`: Add contract checks for profile order, query limit, removed AI summary count, and compact panel markers.
- Modify `src/app/user/profile/page.tsx`: Move `AssistantHistoryPanel` after recommendation section, reduce `take` to `2`, remove AI count from the summary.
- Modify `src/components/user/AssistantHistoryPanel.tsx`: Compact padding, heading, empty state, and conversation rows.

---

### Task 1: Profile AI History Order And Query Limit

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/app/user/profile/page.tsx`

**Interfaces:**
- Consumes: `AssistantHistoryPanel` with prop `conversations`.
- Produces: Profile order where `AssistantHistoryPanel` appears after the recommendation section and AI query uses `take: 2`.

- [ ] **Step 1: Write failing profile order/query contract test**

Add to `src/app/home-anime-contract.test.ts`:

```ts
const profilePage = readFileSync(join(root, 'src/app/user/profile/page.tsx'), 'utf8');

it('keeps AI assistant history compact and last on the profile page', () => {
  expect(profilePage).toContain('take: 2');
  expect(profilePage).not.toContain('个 AI 会话');
  expect(profilePage.indexOf('MovieGridSection title={recommendations.title}')).toBeLessThan(profilePage.indexOf('<AssistantHistoryPanel conversations={aiConversations} />'));
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because the query still uses `take: 5`, the summary still renders `个 AI 会话`, and `AssistantHistoryPanel` is before movie sections.

- [ ] **Step 3: Implement profile order and query changes**

In `src/app/user/profile/page.tsx`:

- Change the AI conversation query from `take: 5` to `take: 2`.
- Remove `<strong>{aiConversations.length} 个 AI 会话</strong>` from the summary.
- Move `<AssistantHistoryPanel conversations={aiConversations} />` after the recommendation `MovieGridSection`.

The final order inside `<main>` must be:

```tsx
<section ...>个人中心...</section>
<MovieGridSection title="最近观看" ... />
<MovieGridSection title="最近收藏" ... />
<MovieGridSection title={recommendations.title} ... />
<AssistantHistoryPanel conversations={aiConversations} />
```

- [ ] **Step 4: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS for the new profile order/query assertions.

- [ ] **Step 5: Commit profile order/query change**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/app/user/profile/page.tsx
git commit -m "feat: move profile AI history to bottom"
```

---

### Task 2: Compact Assistant History Panel

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/components/user/AssistantHistoryPanel.tsx`

**Interfaces:**
- Consumes: `conversations: Conversation[]` already limited by caller.
- Produces: Compact section marker `aria-label="AI 助手记录摘要"`, compact copy, two-column-friendly lightweight rows, and single-line preview styles.

- [ ] **Step 1: Write failing compact panel contract test**

Add to `src/app/home-anime-contract.test.ts`:

```ts
const assistantHistoryPanel = readFileSync(join(root, 'src/components/user/AssistantHistoryPanel.tsx'), 'utf8');

it('renders profile AI history as a compact low-emphasis summary', () => {
  expect(assistantHistoryPanel).toContain('aria-label="AI 助手记录摘要"');
  expect(assistantHistoryPanel).toContain('padding: 16');
  expect(assistantHistoryPanel).toContain('fontSize: \'1rem\'');
  expect(assistantHistoryPanel).toContain('暂无 AI 对话记录，可从右下角助手开始。');
  expect(assistantHistoryPanel).toContain('whiteSpace: \'nowrap\'');
  expect(assistantHistoryPanel).toContain('textOverflow: \'ellipsis\'');
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because the panel still uses large padding, large copy, old empty message, and no compact marker.

- [ ] **Step 3: Implement compact panel**

In `src/components/user/AssistantHistoryPanel.tsx`, update the section and rows:

```tsx
<section className="glass" aria-label="AI 助手记录摘要" style={{ padding: 16, borderRadius: 12, marginTop: 18 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
    <div>
      <h2 style={{ margin: 0, fontSize: '1rem' }}>AI 助手记录</h2>
      <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '.82rem' }}>最近的助手对话摘要。</p>
    </div>
    <Link className="btn" href="/user/assistant">全部记录</Link>
  </div>
```

Use compact rows:

```tsx
<div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
  {conversations.map((conversation) => {
    const lastMessage = conversation.messages?.[0];
    return (
      <Link key={conversation.id} href={`/user/assistant?conversation=${conversation.id}`} style={{ display: 'grid', gap: 4, padding: '9px 10px', border: '1px solid rgba(120,160,220,.2)', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
        <strong style={{ fontSize: '.9rem' }}>{conversation.title}</strong>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '.8rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{lastMessage?.content || '暂无消息'}</p>
        <small style={{ color: 'var(--muted)', fontSize: '.72rem' }}>{conversation.updatedAt.toLocaleString('zh-CN')}</small>
      </Link>
    );
  })}
</div>
```

Use compact empty state:

```tsx
<p style={{ color: 'var(--muted)', margin: '10px 0 0', fontSize: '.82rem' }}>暂无 AI 对话记录，可从右下角助手开始。</p>
```

- [ ] **Step 4: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit compact panel change**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/components/user/AssistantHistoryPanel.tsx
git commit -m "feat: compact profile AI history panel"
```

---

### Task 3: Verification And Preview Refresh

**Files:**
- No source files expected after Tasks 1-2.

**Interfaces:**
- Consumes: current preview worktree.
- Produces: refreshed `movieflex-home-preview` on port `3070`.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run Webpack production build**

Run: `npx next build --webpack`

Expected: build exits successfully.

- [ ] **Step 3: Restart 3070 preview**

Run: `pm2 restart movieflex-home-preview --update-env`

Expected: PM2 shows `movieflex-home-preview` online on `-p 3070`.

- [ ] **Step 4: Smoke test profile route**

Run: `curl -I --max-time 10 http://127.0.0.1:3070/user/profile`

Expected: unauthenticated redirect or `200 OK`, but no server error.

---

## Plan Self-Review

- Spec coverage: Task 1 moves the panel to the bottom, reduces query to two, and removes misleading AI count. Task 2 compacts the panel and empty state. Task 3 verifies tests, build, and 3070 preview.
- Placeholder scan: No TBD/TODO placeholders remain. All paths, text, commands, and expected outcomes are explicit.
- Type consistency: `AssistantHistoryPanel`, `aiConversations`, `listing` order assertions, and compact marker names are used consistently.
