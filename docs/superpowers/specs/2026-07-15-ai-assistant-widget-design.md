# AI 助手挂件设计

## 目标

将现有看板娘升级为全新的 AI 助手挂件：支持电影推荐问答、上传电影封皮进行多模态提问、流式回答、登录用户多会话持久化、游客单会话本地存储，并在后台新增系统设置配置网站信息与 OpenAI 兼容 AI 服务。

## 关键决策

- 彻底删除现有看板娘 AI 聊天实现，重建新的助手挂件，不在旧 AI 组件上做补丁式修改。
- 后台 AI 配置采用 OpenAI Chat Completions 兼容格式：API 端点、API 密钥、模型 ID。
- 后台只提示管理员使用支持图片输入的多模态模型，不增加多模态开关。
- API 密钥只允许填写或覆盖，不回显明文；保存时留空表示保持旧密钥不变。
- 网站 logo 和 favicon 第一版只支持 URL 配置，不做上传。
- 登录用户支持多个会话/线程并保存到数据库；游客只保留一个浏览器本地会话，刷新和重开浏览器后继续同一串记录。
- 图片不保存原图，只保存用户文本、AI 回答、原始文件名、MIME 类型、图片大小和 `hasImage` 标记。

## 数据模型

新增 `AiConversation`：保存登录用户会话，包含用户 ID、标题、创建时间、更新时间。

新增 `AiMessage`：保存登录用户消息，包含会话 ID、角色、内容、是否包含图片、图片文件名、MIME 类型、图片大小、创建时间。

继续使用现有 `SystemSetting` 保存系统设置。新增键：

- `site_name`
- `site_slogan`
- `site_description`
- `site_logo_url`
- `site_favicon_url`
- `ai_base_url`
- `ai_api_key`
- `ai_model_id`

## API 设计

新增后台系统设置接口：

- `GET /api/admin/settings`：返回网站设置、AI 设置和 `aiApiKeyConfigured` 状态，不返回密钥。
- `PATCH /api/admin/settings`：保存设置；`aiApiKey` 空字符串不覆盖旧密钥。

新增助手接口：

- `GET /api/assistant/conversations`：登录用户获取会话列表。
- `POST /api/assistant/conversations`：登录用户创建新会话。
- `GET /api/assistant/conversations/[id]`：登录用户读取会话消息。
- `DELETE /api/assistant/conversations/[id]`：登录用户删除会话。
- `POST /api/assistant/chat`：统一流式聊天接口。登录用户可带 `conversationId`，游客只传本地消息上下文。接口返回 Server-Sent Events。

## AI 调用

服务端从 `SystemSetting` 读取 AI 配置。请求 OpenAI 兼容 `/chat/completions` 接口时启用 `stream: true`。

文本消息使用标准 `content: string`。带图片时使用 OpenAI Vision 格式：

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "这是什么电影？" },
    { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
  ]
}
```

服务端流式转发为内部 SSE：

```text
data: {"text":"片段"}

data: {"conversationId":1,"messageId":2}

data: [DONE]
```

## 前台体验

全站保留一个可拖动助手挂件。挂件点击后打开聊天面板：

- 支持文字输入。
- 支持选择一张图片，限制为常见图片 MIME 类型和合理大小。
- 登录用户显示“新对话”和最近会话入口。
- 游客仅显示一个本地对话，并提示登录后可保存多个会话。
- 流式回答期间禁用重复提交，并允许错误消息显示在对话中。

## 个人中心

个人中心首页新增“AI 助手记录”区块，展示最近 5 个会话。新增 `/user/assistant` 页面展示会话列表和当前会话详情。移动端优先展示列表，点击后查看详情。

## 后台系统设置

后台侧边栏新增“系统设置”。设置页分为：

- 网站信息：网站名称、简介、logo URL、favicon URL。
- AI 助手：API 端点、模型 ID、API 密钥、使用多模态模型提示。

## 错误处理和安全

- AI 未配置时返回明确错误。
- 后台不回显 AI 密钥。
- 图片只在本次请求中转发给 AI 服务，不落盘、不入库保存原图。
- 登录用户只能访问自己的会话。
- 游客会话只存浏览器 localStorage。
- AI 请求超时后终止流并返回错误事件。

## 测试

- 单元测试系统设置密钥遮蔽和空值不覆盖。
- 单元测试 OpenAI 流式文本解析。
- 单元测试助手消息转换，包含图片 metadata 保存策略。
- 静态测试确保后台新增系统设置菜单。
- 运行 `npm test -- --run` 和 `npx next build --webpack`。
