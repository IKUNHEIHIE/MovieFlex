# 管理后台与播放恢复设计

## 目标

恢复可用的管理员采集源管理后台，并让量子云分享页和直接 HLS 地址按正确播放模式渲染。

## 后台

- `/admin` 作为管理员运营概览，显示采集源总数、启用来源数、影片总数和最近同步时间。
- `/admin/sources` 管理现有采集源：查看列表、新增 JSON/XML 来源、执行最近 24 小时或全量采集，并展示抓取、保存和分类映射告警结果。
- `app/admin/layout.tsx` 在服务端鉴权：未登录跳转 `/login?callbackUrl=%2Fadmin`，非管理员跳转 `/user/profile?notice=admin-only`。
- 后台导航只列出已经实现的“运营概览”和“采集源”，避免死链。
- 复用现有采集 API：`GET/POST /api/collect/sources` 与 `POST /api/collect/run`。本次不修改采集器、数据库模型或 API 语义。

## 播放

- 电影详情页使用 `src/lib/playback.ts` 的分组和选择逻辑，而不是本地重复解析。
- 内置生产播放源注册：`liangzi` 使用 `IFRAME_DIRECT`。
- `VideoPlayer` 根据模式渲染：
  - `HLS` 仅对直接媒体地址使用 `hls.js`。
  - `IFRAME_DIRECT` 使用受限 iframe 嵌入安全的分享页 URL。
  - `IFRAME_RESOLVER` 使用已有 `buildResolverUrl()` 生成解析页地址后嵌入。
- HLS 网络错误最多恢复两次，后续显示明确错误，不再无限重试。
- 未注册、停用或不安全的播放地址不渲染播放器。

## 验收

- 管理员可访问 `/admin` 与 `/admin/sources`；非管理员无法直接访问。
- 管理员可通过界面新增来源并启动两种采集模式，看到 API 返回结果。
- `liangzi` 分享页以 iframe 播放；直接 `.m3u8` 仍走 HLS。
- 相关测试、`npm run build` 和生产 HTTP 检查通过；服务运行于 `0.0.0.0:3000`。

## 边界

- 不实现数据大屏、影片库、用户管理或分类映射管理。
- 不改 Spark、Kafka 或采集器本身。
- 不在本次修改影片详情 GET 请求写入 `viewCount` 的既有行为。
