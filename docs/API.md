# API 文档

项目 API 均使用 Next.js Route Handler 实现，源码位于 `src/app/api`。

## 响应格式

大多数 JSON 接口成功时返回：

```json
{ "success": true, "data": {} }
```

失败时通常返回：

```json
{ "success": false, "error": "错误信息" }
```

## 认证规则

- 未特别说明的公开接口不需要登录。
- 用户接口需要普通登录用户。
- 后台接口需要 `ADMIN` 角色，并通过 `requireAdmin()` 校验。
- 内部重试接口需要服务端令牌。

## 认证接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | 公开 | 注册用户。项目逻辑会把首个注册用户设为管理员。 |
| `GET/POST` | `/api/auth/[...nextauth]` | 公开 | Auth.js 处理器，包含登录、会话、CSRF 和退出登录。 |

## 用户接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET/PATCH` | `/api/user/profile` | 用户 | 读取或更新用户资料。 |
| `POST/DELETE` | `/api/user/favorites/[movieId]` | 用户 | 收藏或取消收藏影片。 |
| `DELETE` | `/api/user/history/[id]` | 用户 | 删除观看历史。 |

## 行为事件接口

### `POST /api/events`

权限：可匿名，也可带用户会话。

用途：记录播放行为，同步更新登录用户观看历史，并通过 EventOutbox 投递 Kafka 分析事件。

请求体：

```json
{
  "eventType": "play_start",
  "movieId": 1,
  "data": {
    "episode": "正片",
    "progress": 10,
    "currentTime": 120,
    "duration": 1200
  }
}
```

支持的 `eventType`：`play_start`、`play_progress`、`play_end`、`view`。

响应示例：

```json
{ "success": true, "kafkaDelivered": true }
```

## 采集接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/collect/sources` | 管理员 | 获取采集源列表。 |
| `POST` | `/api/collect/sources` | 管理员 | 创建采集源。 |
| `PATCH/DELETE` | `/api/collect/sources/[sourceKey]` | 管理员 | 更新或删除采集源。 |
| `GET/POST` | `/api/collect/tasks` | 管理员 | 获取或创建采集任务。 |
| `PATCH` | `/api/collect/tasks/[id]` | 管理员 | 暂停、继续或取消采集任务。 |
| `POST` | `/api/collect/run` | 管理员 | 已废弃，返回 `410`，请使用 `/api/collect/tasks`。 |

采集源请求体示例：

```json
{
  "name": "Example CMS",
  "apiUrl": "https://example.com/api.php/provide/vod/",
  "sourceKey": "example",
  "format": "JSON",
  "playerConfigs": []
}
```

## 后台影片接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/admin/movies` | 管理员 | 创建手动影片记录。 |
| `PATCH/PUT/DELETE` | `/api/admin/movies/[id]` | 管理员 | 更新或删除影片。 |

创建影片请求体摘要：

```json
{
  "title": "影片名称",
  "typeId": 1,
  "director": "导演",
  "actors": "演员 A, 演员 B",
  "description": "剧情简介",
  "year": 2026,
  "area": "中国大陆",
  "language": "国语",
  "picUrl": "https://example.com/poster.jpg",
  "score": 8.5
}
```

## 后台用户接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users?search=&page=1&pageSize=20` | 管理员 | 分页搜索用户。 |
| `POST` | `/api/admin/users` | 管理员 | 创建用户。 |
| `PATCH/DELETE` | `/api/admin/users/[id]` | 管理员 | 修改角色、资料、密码或删除用户。 |

## 后台分类和映射接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET/POST` | `/api/admin/catalog/categories` | 管理员 | 获取或创建分类。 |
| `PATCH/DELETE` | `/api/admin/catalog/categories/[id]` | 管理员 | 更新或删除分类。 |
| `GET` | `/api/admin/mappings` | 管理员 | 获取来源分类映射。 |
| `PATCH/DELETE` | `/api/admin/mappings/[id]` | 管理员 | 更新或删除映射。 |
| `POST` | `/api/admin/mappings/reclassify` | 管理员 | 按映射重新归类影片。 |
| `POST` | `/api/admin/mappings/smart-classify` | 管理员 | 执行智能分类。 |

## 后台统计接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats/movies?sort=viewCount&category=1` | 管理员 | 影片热度和互动统计。 |
| `GET` | `/api/admin/stats/categories` | 管理员 | 分类分布统计。 |
| `GET` | `/api/admin/stats/users` | 管理员 | 用户行为统计。 |
| `GET` | `/api/admin/stats/trends?days=30` | 管理员 | 全局每日观看、收藏和活跃用户趋势。 |
| `GET` | `/api/admin/health/history` | 管理员 | 数据大屏使用的内存健康历史。 |

## 后台运维接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `PATCH` | `/api/admin/themes/active` | 管理员 | 设置前台当前主题。 |
| `POST` | `/api/admin/outbox/retry` | 管理员 | 重试待投递 Kafka 事件。 |
| `GET/PATCH` | `/api/admin/settings` | 管理员 | 读取或保存网站信息、logo、favicon 和 AI 助手配置。AI 密钥只显示是否已配置，留空保存时不会覆盖旧密钥。 |

## 内部接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/internal/health` | 内部/后台 UI | 返回数据库、Kafka、影片数量、outbox、采集任务和推荐批次健康信息。 |
| `POST` | `/api/internal/outbox/retry` | 令牌 | 使用 `MOVIEFLEX_OUTBOX_TOKEN` 重试待处理 outbox 事件。 |

## 助手接口

| 方法 | 路由 | 权限 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/assistant/chat` | 公开/用户 | OpenAI 兼容流式聊天接口。游客不落库，登录用户可带 `conversationId` 保存到会话。 |
| `GET/POST` | `/api/assistant/conversations` | 用户 | 获取登录用户 AI 会话列表或创建新会话。 |
| `GET/DELETE` | `/api/assistant/conversations/[id]` | 用户 | 读取或删除自己的 AI 会话消息。 |

### `POST /api/assistant/chat`

后台需先在「系统设置」里配置 OpenAI 兼容 API 端点、密钥和模型 ID。若要支持电影封皮识别，请使用支持多模态输入的模型。

请求体示例：

```json
{
  "conversationId": 1,
  "messages": [
    { "role": "user", "content": "推荐一部适合周末看的科幻片" }
  ]
}
```

带图片时，前端只在本次请求传递 data URL；服务端不会保存原图，只保存文件名、MIME 类型、大小和 `hasImage` 标记。

流式响应示例：

```text
data: {"text":"推荐"}

data: {"conversationId":1}

data: [DONE]
```
