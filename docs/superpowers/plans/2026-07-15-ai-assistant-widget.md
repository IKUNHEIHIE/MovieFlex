# AI Assistant Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new AI assistant widget with OpenAI-compatible streaming, multimodal cover questions, persisted multi-conversation history for logged-in users, local single-conversation history for guests, and admin-configurable system settings.

**Architecture:** Add focused Prisma models for logged-in AI conversations/messages, keep guest history in browser localStorage, and centralize AI/provider/system-setting logic under `src/lib`. Replace the old mascot AI implementation with a new client widget that talks to new streaming APIs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, MySQL/MariaDB, Auth.js v5, CSS Modules, Vitest, OpenAI-compatible Chat Completions over SSE.

## Global Constraints

- Production builds must use `npx next build --webpack`.
- Do not save uploaded image bytes or original files; only save text, filename, MIME type, size, and `hasImage` metadata.
- Admin AI API key must never be returned in plaintext; blank API key updates keep the previous value.
- Guest users have exactly one localStorage conversation that persists across refreshes and browser restarts.
- Logged-in users can have multiple database conversations and can only access their own conversations.
- Remove the existing mascot AI implementation and rebuild the AI widget cleanly.

---

### Task 1: Data Models and Settings Helpers

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/system-settings.ts`
- Create: `src/lib/system-settings.test.ts`
- Create: `src/lib/assistant-types.ts`

**Interfaces:**
- Produces: `getPublicSystemSettings(): Promise<PublicSystemSettings>`
- Produces: `getAdminSystemSettings(): Promise<AdminSystemSettings>`
- Produces: `saveAdminSystemSettings(input: AdminSystemSettingsInput): Promise<void>`
- Produces: `type AssistantChatMessage`

**Steps:**
- [ ] Add `AiConversation` and `AiMessage` Prisma models and relations to `User`.
- [ ] Implement settings normalization, default values, key upsert, and API key masking behavior.
- [ ] Add tests for blank API key preserving old value and admin settings not returning plaintext key.
- [ ] Run `npm test -- --run src/lib/system-settings.test.ts`.

### Task 2: Assistant Provider and Persistence

**Files:**
- Create: `src/lib/assistant-provider.ts`
- Create: `src/lib/assistant-provider.test.ts`
- Create: `src/lib/assistant-store.ts`
- Create: `src/lib/assistant-store.test.ts`

**Interfaces:**
- Consumes: `AssistantChatMessage`
- Produces: `extractOpenAIStreamText(payload: unknown): string`
- Produces: `buildOpenAIMessages(messages: AssistantChatMessage[]): OpenAIChatMessage[]`
- Produces: `createConversation(userId: number, title?: string): Promise<number>`
- Produces: `appendMessage(input: AppendAssistantMessageInput): Promise<void>`

**Steps:**
- [ ] Implement OpenAI-compatible message building for text and image inputs.
- [ ] Implement stream text extraction from `choices[0].delta.content`, `choices[0].message.content`, and string content arrays.
- [ ] Implement conversation ownership checks and message append helpers.
- [ ] Add tests for image metadata persistence shape and stream parser.
- [ ] Run targeted tests for the new lib files.

### Task 3: Assistant and Settings APIs

**Files:**
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/app/api/assistant/chat/route.ts`
- Create: `src/app/api/assistant/conversations/route.ts`
- Create: `src/app/api/assistant/conversations/[id]/route.ts`
- Delete: `src/app/api/assistant/route.ts`

**Interfaces:**
- Consumes: settings helpers from Task 1 and provider/store helpers from Task 2.
- Produces: admin settings JSON API and assistant SSE API.

**Steps:**
- [ ] Add admin-only settings GET/PATCH route.
- [ ] Add logged-in conversation list/create/read/delete routes.
- [ ] Add streaming chat route for guests and logged-in users.
- [ ] Persist logged-in user/assistant messages after stream completion.
- [ ] Return internal SSE records with `{ text }`, optional `{ conversationId }`, and `[DONE]`.

### Task 4: Admin System Settings UI

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/components/admin/SystemSettingsForm.tsx`
- Modify: `src/components/admin/OperationsSidebar.tsx`
- Modify: `src/app/admin/admin-style.test.ts`

**Interfaces:**
- Consumes: `/api/admin/settings`.

**Steps:**
- [ ] Add “系统设置” menu item.
- [ ] Build website information fields and AI configuration fields.
- [ ] Show API key configured/unconfigured status without plaintext value.
- [ ] Add helper text telling admins to use a multimodal model for image questions.
- [ ] Update static admin style test to require the new menu link.

### Task 5: Rebuilt Assistant Widget

**Files:**
- Delete: `src/components/mascot/FurinaMascot.tsx`
- Create: `src/components/assistant/AiAssistantWidget.tsx`
- Create: `src/components/assistant/AiAssistantWidget.module.css`
- Create: `src/components/assistant/assistant-storage.ts`
- Create: `src/components/assistant/assistant-storage.test.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `/api/assistant/chat` and conversation APIs.
- Produces: new draggable assistant widget.

**Steps:**
- [ ] Remove old mascot AI component from app layout.
- [ ] Add new assistant widget with draggable mascot, chat panel, text input, image picker, stream reader, and localStorage guest history.
- [ ] For logged-in users, load/create/switch database conversations.
- [ ] For guests, persist exactly one local conversation in localStorage.
- [ ] Add localStorage parser tests.

### Task 6: User Center AI History

**Files:**
- Modify: `src/app/user/profile/page.tsx`
- Create: `src/app/user/assistant/page.tsx`
- Create: `src/components/user/AssistantHistoryPanel.tsx`

**Interfaces:**
- Consumes: `AiConversation` and `AiMessage` Prisma models.

**Steps:**
- [ ] Add recent 5 AI conversations to profile page.
- [ ] Add `/user/assistant` page with conversation list and selected conversation details.
- [ ] Ensure unauthenticated users redirect to login.

### Task 7: Verification and Docs

**Files:**
- Modify: `docs/API.md`
- Modify: `docs/MODULES.md`
- Modify: `.env.example`

**Steps:**
- [ ] Document new settings and assistant APIs.
- [ ] Document AI assistant module behavior.
- [ ] Run `npm test -- --run`.
- [ ] Run `npx next build --webpack`.
- [ ] Commit and push changes after verification.
