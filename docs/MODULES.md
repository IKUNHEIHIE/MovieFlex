# 模块介绍

## 前台观影模块

相关文件：

- `src/app/page.tsx`
- `src/app/movies/page.tsx`
- `src/app/movie/[id]/page.tsx`
- `src/app/search/page.tsx`
- `src/components/player/*`

职责：

- 展示首页、影片列表、搜索结果和影片详情。
- 提供 HLS 播放能力。
- 向 `/api/events` 上报播放行为。
- 支持类型、地区、语言、年份等元数据筛选。

## 认证和用户中心

相关文件：

- `src/lib/auth/auth.ts`
- `src/lib/auth/authorization.ts`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/user/profile/page.tsx`
- `src/app/user/account/page.tsx`

职责：

- 使用 Auth.js 实现邮箱密码登录。
- 支持用户注册、资料展示和账号管理。
- 管理收藏、观看历史和账号更新。
- 为后台页面和后台 API 提供管理员权限校验。

## 后台布局和运营概览

相关文件：

- `src/app/admin/layout.tsx`
- `src/app/admin/admin.module.css`
- `src/app/admin/page.tsx`
- `src/app/admin/overview-data.ts`
- `src/components/admin/OperationsSidebar.tsx`

职责：

- 提供统一后台布局、侧边栏和页面过渡。
- 渲染运营概览驾驶舱，包括核心指标、待处理事项、采集状态、内容库健康、热门影片和快捷操作。
- 保持后台样式集中在 `admin.module.css`。

## 影片管理模块

相关文件：

- `src/app/admin/movies/page.tsx`
- `src/app/admin/movies/new/page.tsx`
- `src/app/admin/movies/[id]/page.tsx`
- `src/components/admin/MovieEditForm.tsx`
- `src/app/api/admin/movies/*`

职责：

- 搜索和分页展示影片。
- 创建、编辑和删除手动影片记录。
- 标准化地区、语言等影片元数据。
- 维护影片地区和语言关系表。

## 采集和目录管理

相关文件：

- `src/components/admin/CollectSourceManager.tsx`
- `src/components/admin/catalog/CategoryManagement.tsx`
- `src/components/admin/catalog/CategoryTree.tsx`
- `src/app/api/collect/*`
- `src/app/api/admin/catalog/*`
- `src/app/api/admin/mappings/*`
- `src/lib/collector/*`

职责：

- 管理 AppleCMS 采集源。
- 创建和控制可恢复采集任务。
- 管理本地分类树。
- 将采集源分类映射到本地分类。
- 映射变化后重新归类影片。

## 统计分析模块

相关文件：

- `src/app/admin/stats/movies/page.tsx`
- `src/app/admin/stats/categories/page.tsx`
- `src/app/admin/stats/users/page.tsx`
- `src/app/admin/stats/trends/page.tsx`
- `src/app/api/admin/stats/*`
- `src/lib/stats/*`
- `scripts/run-stats-consumer.ts`
- `scripts/backfill-demo-analytics.ts`

职责：

- 消费 Kafka 用户行为事件。
- 兼容 camelCase 和 snake_case 字段命名。
- 更新 `DailyStats` 和其他分析表。
- 展示影片、分类、用户和时间趋势统计。

## EventOutbox 和 Kafka

相关文件：

- `src/lib/kafka.ts`
- `src/lib/outbox.ts`
- `src/app/api/events/route.ts`
- `src/app/api/admin/outbox/retry/route.ts`
- `src/app/api/internal/outbox/retry/route.ts`

职责：

- 将行为事件写入 `EventOutbox`。
- 尝试立即投递 Kafka。
- Kafka 不可用时保留 `PENDING` 事件用于后续重试。
- 提供后台和内部重试接口。

## 健康大屏

相关文件：

- `src/app/admin/dashboard/page.tsx`
- `src/components/admin/HealthMonitor.tsx`
- `src/lib/health.ts`
- `src/app/api/internal/health/route.ts`
- `src/app/api/admin/health/history/route.ts`

职责：

- 展示数据库延迟、Kafka 状态、待投递事件、最新采集任务和最新推荐批次。
- 在内存中维护短期健康历史，供图表展示。

## 主题管理

相关文件：

- `src/app/admin/themes/page.tsx`
- `src/components/admin/ThemeButton.tsx`
- `src/app/api/admin/themes/active/route.ts`
- `themes/`

职责：

- 选择当前前台主题。
- 从主题资源目录加载对应样式。

## 推荐模块

相关文件：

- `src/lib/recommendations.ts`
- `src/lib/demo-analytics.ts`
- `prisma/schema.prisma` 中的 `Recommendation` 模型

职责：

- 存储推荐批次。
- 为用户中心提供推荐影片。
- 为运营概览和健康大屏提供推荐批次状态。

## 测试模块

相关文件：

- `src/**/*.test.ts`
- `src/**/*.test.tsx`

职责：

- 覆盖校验、认证路由、采集逻辑、元数据标准化、播放辅助逻辑、统计事件归一化、后台边界和运营概览数据。
- 使用静态回归测试防止后台 Server Component 边界错误和旧设计系统残留。 
