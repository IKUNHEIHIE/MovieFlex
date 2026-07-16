# Compact Profile AI History Design

## Goal

Reduce the visual priority and page footprint of the personal-center AI assistant history. The AI assistant record is useful, but it is not the main purpose of the profile page. It should appear after the user's core viewing content and use a compact summary layout.

## Scope

- Move the AI assistant history block to the bottom of `/user/profile`.
- Keep the profile overview, recently watched, favorites, and recommendations above it.
- Compact the AI history block so it no longer dominates the page.
- Preserve the link to `/user/assistant` for full history.
- Keep the AI conversation data query lightweight.

## Out Of Scope

- No changes to `/user/assistant` full history page.
- No changes to assistant chat storage or API behavior.
- No changes to recommendation, favorite, or watch-history logic.
- No new styling library.

## Layout Design

The profile page order should be:

1. Profile overview summary.
2. Recently watched.
3. Recently favorited.
4. Recommendation rail.
5. Compact AI assistant history.

The AI history panel should be a low-emphasis footer-style block. It should have smaller padding, a smaller heading, and less vertical spacing than the movie sections. It should display at most two recent conversations. Each conversation row should show the title, updated time, and a single-line preview of the latest message.

If there are no AI conversations, the panel should show one short muted line: `暂无 AI 对话记录，可从右下角助手开始。`

## Data Design

The profile page should request only the conversations needed for the compact panel. Reduce the query from five conversations to two conversations. Keep including the latest message so the compact preview remains useful.

The profile summary should remove the AI conversation count. After the query is reduced to two conversations, `aiConversations.length` is no longer a reliable total count and should not be presented as one.

## Accessibility

- Keep the section heading semantic.
- Keep the `全部记录` link visible and keyboard-accessible.
- Conversation rows remain normal links with readable text.
- Single-line truncation should not remove the full link target.

## Testing

- Add a contract test that `AssistantHistoryPanel` is rendered after the recommendation section on `/user/profile`.
- Add a contract test that the profile AI conversation query uses `take: 2`.
- Add a contract test that the profile summary no longer renders `AI 会话` count text.
- Add a contract test that `AssistantHistoryPanel` contains compact layout markers and a two-item slice or two-item query assumption.
- Run `npm test -- --run`.
- Run `npx next build --webpack`.
- Refresh the `3070` preview and smoke test `/user/profile` redirects unauthenticated users to login or responds normally depending on session state.

## Acceptance Criteria

- AI assistant history appears at the bottom of the profile page.
- The panel is visibly smaller than before.
- At most two recent AI conversations are shown.
- The full AI history remains reachable through `全部记录`.
- The profile summary does not show a misleading AI conversation count.
- The rest of the profile page keeps its existing content order and behavior.
