# 采集管理与分类管理需求

> **状态：已完成**  
> 创建时间：2026-07-14  
> 完成时间：2026-07-14  
> 归档文件：`docs/superpowers/archived/2026-07-14-catalog-management-requirements.md`

## 1. 菜单结构重构

### 导航变更
将原有的"采集源"和"分类映射"菜单合并为：

```
主菜单：采集管理
  ├── 二级菜单：采集源管理
  └── 二级菜单：分类管理
```

### 侧边栏实现
更新 `OperationsSidebar.tsx`，将采集相关功能组织到"采集管理"一级菜单下。

---

## 2. 分类管理页面设计

### 页面布局
1. **第一排：采集源分类绑定**
   - 选择采集源（下拉框）
   - 显示该采集源的所有分类映射
   - 支持手动触发自动分类按钮
   - 支持手动绑定/修改分类映射

2. **第二排：完整分类树**
   - 展示两层树形结构（大类 + 子分类）
   - 支持展开/折叠
   - 支持查看每个分类下的影片数量
   - 支持新增/编辑/删除分类

### 分类层级结构
采用两层树形结构：
```
大类（如：电影片、连续剧、综艺片、动漫片）
  ├── 子分类（如：动作片、喜剧片、爱情片）
  ├── 子分类
  └── ...
```

### 功能特性
- **自动分类按钮**：对当前采集源的所有影片重新执行自动分类匹配
- **手动绑定**：可以将采集源的分类直接绑定到系统本地分类
- **分类映射查看**：展示所有映射状态（MAPPED、PENDING_REVIEW、IGNORED）

---

## 3. 分类规则系统

### 系统默认分类规则
系统内置一套同义词表，用于自动匹配采集源的分类：

```typescript
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  '动作片': ['动作', '武侠', '功夫'],
  '喜剧片': ['喜剧', '爆笑'],
  '爱情片': ['爱情', '浪漫'],
  '科幻片': ['科幻', '奇幻'],
  '恐怖片': ['恐怖', '惊悚', '悬疑恐怖'],
  '剧情片': ['剧情', '文艺'],
  '战争片': ['战争', '历史战争'],
  '纪录片': ['纪录', '记录', '纪实'],
  // ... 更多同义词
}
```

### 采集时分类流程
1. 采集影片时，从采集源API获取 `type_id` 和 `type_name`
2. 查询 `CategoryMapping` 表，检查该采集源的该 `type_id` 是否已有映射
3. 如果已有映射：
   - `MAPPED` 状态：直接使用 `localCategoryId`
   - `IGNORED` 状态：跳过该影片
   - `PENDING_REVIEW` 状态：使用当前映射（如有）
4. 如果没有映射：
   - 使用同义词表进行匹配
   - 匹配成功：创建 `MAPPED` 状态的映射记录
   - 匹配失败：
     - 创建默认分类（如"其他"）
     - 创建 `PENDING_REVIEW` 状态的映射记录
     - 添加到 warnings 列表

### 默认分类
当无法匹配时，放入系统默认分类：
- 默认分类名称：**其他**
- 默认分类 slug：**other**
- 默认分类 parentId：null（顶级分类）

---

## 4. 采集源管理增强

### 播放器配置
添加采集源时，需要配置该采集源的播放器（AppleCMS播放器配置格式）。

**播放器文件结构**（来自量子云API示例）：

**mac_liangzi.txt（量子云）**：
- `from`: "liangzi"
- `show`: "量子云"
- `code`: `MacPlayer.Html = '<iframe src="'+MacPlayer.PlayUrl+'" ...>';`
- **判定规则**: `src="'+MacPlayer.PlayUrl+'"` → IFRAME_DIRECT 模式

**mac_lzm3u8.txt（量子m3u8）**：
- `from`: "lzm3u8"
- `show`: "量子m3u8"
- `code`: `MacPlayer.Html = '<iframe src="https://lziplayer.com/?url='+MacPlayer.PlayUrl+'" ...>';`
- **判定规则**: `src="...url='...'` → IFRAME_RESOLVER 模式，解析地址为 `https://lziplayer.com/?url=`

**播放器配置方式**：
1. **上传播放器文件**：上传 `.txt` 格式的播放器配置文件（Base64编码的JSON）
2. **粘贴播放器文本**：直接粘贴播放器 JSON 文本

**播放器存储格式**：
在 `CollectSource` 表中新增 `playerConfigs` 字段（JSON），存储多个播放器配置：
```json
[
  {
    "from": "liangzi",
    "show": "量子云",
    "mode": "IFRAME_DIRECT",
    "resolverUrl": null,
    "code": "..."
  },
  {
    "from": "lzm3u8",
    "show": "量子m3u8",
    "mode": "IFRAME_RESOLVER",
    "resolverUrl": "https://lziplayer.com/?url=",
    "code": "..."
  }
]
```

**模式自动判定逻辑**：
从 `code` 字段提取 iframe `src` 模板：
- 若 `src` 模板只含 `MacPlayer.PlayUrl` → `IFRAME_DIRECT`
- 若 `src` 模板包含 `MacPlayer.PlayUrl` 且前有固定前缀 → `IFRAME_RESOLVER`，提取前缀作为 `resolverUrl`

**播放器使用逻辑**：
- 影片详情页根据影片的 `playFrom` 中的编码，匹配对应采集源的播放器配置
- 若有匹配配置，使用配置的 mode 和 resolverUrl 渲染播放器
- 若无配置，回退到系统默认播放器规则（`DEFAULT_PLAYERS`）

**数据库变更**：
```prisma
model CollectSource {
  // ... 现有字段

  // 新增字段：播放器配置（JSON数组）
  playerConfigs Json? @map("player_configs")

  @@map("collect_sources")
}
```

---

## 5. 分类树结构实现

### 初始化系统分类
系统需要初始化一套两层树形分类结构：

**大类**：
- 电影片
- 连续剧
- 综艺片
- 动漫片
- 纪录片
- 其他

**子分类示例**（电影片下）：
- 动作片
- 喜剧片
- 爱情片
- 科幻片
- 恐怖片
- 剧情片
- 战争片

**子分类示例**（连续剧下）：
- 国产剧
- 香港剧
- 台湾剧
- 韩国剧
- 日本剧
- 欧美剧
- 海外剧
- 泰国剧

### 分类数据模型
当前 `Category` 模型已支持父子关系：
```prisma
model Category {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(50)
  slug      String   @unique @db.VarChar(50)
  parentId  Int?     @map("parent_id")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  parent   Category?  @relation("CategoryParent", fields: [parentId], references: [id])
  children Category[] @relation("CategoryParent")

  @@map("categories")
}
```

---

## 6. API 接口设计

### 分类管理 API

**GET /api/admin/categories**
- 获取所有分类（树形结构）
- 返回格式：`[{ id, name, slug, parentId, children: [...] }]`

**POST /api/admin/categories**
- 创建新分类
- 参数：`{ name, slug, parentId, sortOrder }`

**PATCH /api/admin/categories/[id]**
- 更新分类
- 参数：`{ name, slug, parentId, sortOrder }`

**DELETE /api/admin/categories/[id]**
- 删除分类（需要检查是否有子分类或关联影片）

**POST /api/admin/categories/auto-classify**
- 手动触发自动分类
- 参数：`{ sourceKey }`
- 对指定采集源的所有影片重新执行自动分类

### 采集源管理 API 增强

**POST /api/admin/sources**（已有）
- 新增字段：`playerHtml`, `playerType`

**PATCH /api/admin/sources/[id]**（已有）
- 新增字段：`playerHtml`, `playerType`

---

## 7. 实施步骤

### 阶段一：数据库与模型
1. 在 `CollectSource` 模型中新增播放器字段
2. 运行数据库迁移
3. 更新 Prisma Client

### 阶段二：菜单重构 ✅
1. ✅ 更新 `OperationsSidebar.tsx`，添加"采集管理"一级菜单
2. ✅ 调整路由结构（如需要）
   - 创建 `/admin/catalog` 目录结构
   - 迁移采集源管理到 `/admin/catalog/sources`
   - 迁移分类映射到 `/admin/catalog/categories`
   - 旧路由自动重定向到新路由

### 阶段三：分类管理页面 ✅ 已完成
1. ✅ 创建新的分类管理页面 `/admin/catalog/categories`
2. ✅ 实现树形分类展示组件 `CategoryTree.tsx`（支持展开/折叠、编辑、删除、添加子分类）
3. ✅ 实现采集源分类绑定功能（在 `CategoryManagement.tsx` 中集成映射选择器）
4. ✅ 完成分类 API：GET（树形结构）、POST（创建）、PATCH（更新）、DELETE（删除）
5. ✅ 支持分类映射可视化编辑：选择本地分类或忽略
6. ✅ 支持添加顶级分类和子分类的弹窗表单

### 阶段四：采集源管理增强（播放器配置） ✅ 已完成
1. ✅ 更新采集源表单，添加播放器配置（支持文件上传和文本粘贴）
2. ✅ 实现播放器配置解析和模式自动检测（IFRAME_DIRECT/IFRAME_RESOLVER）
3. ✅ 更新采集源 API，支持保存和更新 playerConfigs 字段
4. ✅ 数据库 schema 已添加 playerConfigs JSON 字段
5. ✅ Prisma Client 已重新生成

### 阶段五：分类初始化 ✅ 已完成
1. ✅ 执行 `scripts/init-categories.ts` 脚本
2. ✅ 初始化 6 个一级分类（电影片、连续剧、综艺片、动漫片、纪录片、其他）
3. ✅ 初始化 25 个二级分类（动作片、喜剧片、国产剧、韩国剧等）
4. ✅ 分类数据已写入 `newmovie` 数据库的 `categories` 表
5. ✅ 数据库验证：共 31 条分类记录，父子关系正确

### 阶段六：测试与验证 ✅ 已完成
1. ✅ TypeScript 编译通过（`npm run build` 成功）
2. ✅ 所有 14 个测试文件通过（81 个测试用例）
3. ✅ 服务成功运行在 3060 端口（HTTP 200）
4. ✅ 分类管理页面 `/admin/catalog/categories` 可正常访问
5. ✅ 采集源管理页面 `/admin/catalog/sources` 支持播放器配置
6. ✅ 分类树形展示正常工作（6 个父分类 + 25 个子分类）

### 阶段七：功能验证 ✅ 已完成
1. ✅ 播放器配置解析功能正常（IFRAME_DIRECT / IFRAME_RESOLVER 模式识别）
2. ✅ 分类同义词匹配逻辑正常（`src/lib/collector/category.ts` 中 22 组同义词）
3. ✅ 分类映射管理功能正常（支持 MAPPED / PENDING_REVIEW / IGNORED 状态）
4. ✅ 分类 API 完整（POST / PATCH / DELETE 已实现）
5. ✅ 采集源 API 完整（支持 playerConfigs JSON 字段）

---

## 8. 已完成讨论事项

### 播放器文件探索 ✅
- 量子云播放器文件已分析（mac_liangzi.txt、mac_lzm3u8.txt）
- liangzi → IFRAME_DIRECT 模式（直接嵌入URL）
- lzm3u8 → IFRAME_RESOLVER 模式（通过 lziplayer.com 解析）
- 播放器配置存储为 JSON 格式，包含 from/show/mode/resolverUrl/code 字段
- 模式自动判定逻辑已设计

### 分类规则优化 ✅
- 当前使用同义词表匹配，暂不扩展更复杂规则
- 默认分类为"其他"（slug: other, parentId: null）
- 匹配失败时创建 PENDING_REVIEW 映射记录

### 数据迁移 ✅
- 现有 CategoryMapping 数据保留，采集时自动补充映射
- 现有 Category 数据保留，新增两层树形结构的大类
- 新分类通过 parentId 关联到对应大类

---

## 9. 完成归档

**归档时间**：2026-07-14  
**归档位置**：`docs/superpowers/archived/2026-07-14-catalog-management-requirements.md`

### 实施总结
所有需求已成功实施，系统现支持：
- 两层树形分类结构（6 个一级分类 + 25 个二级分类）
- 采集源播放器配置（支持 JSON 格式的播放器文件上传和粘贴）
- 分类自动匹配（基于同义词表）和手动映射管理
- 完整的分类管理界面（树形展示、编辑、删除、添加）
- 播放器模式自动识别（IFRAME_DIRECT / IFRAME_RESOLVER）

### 关键文件清单
- `scripts/init-categories.ts` - 分类初始化脚本
- `src/lib/collector/player-config.ts` - 播放器配置解析
- `src/lib/collector/category.ts` - 分类同义词和自动匹配
- `src/app/admin/catalog/` - 采集管理模块（sources / categories）
- `src/app/api/collect/sources/route.ts` - 采集源 API（支持 playerConfigs）
- `src/app/api/admin/catalog/categories/route.ts` - 分类管理 API

---

## 附录

### 量子云采集源分类示例

从 API `https://cj.lziapi.com/api.php/provide/vod/from/liangzi/at/xml/` 获取的分类：

**大类（type_id 1-4, 20）**：
- 1: 电影片
- 2: 连续剧
- 3: 综艺片
- 4: 动漫片
- 20: 记录片

**子分类示例（连续剧下）**：
- 13: 国产剧
- 14: 香港剧
- 15: 韩国剧
- 16: 欧美剧
- 21: 台湾剧
- 22: 日本剧
- 23: 海外剧
- 24: 泰国剧

**其他分类**：
- 52: AI漫剧
- 41: 电影解说
- 42-45: 体育类
- 46: 预告片
- 47: 短剧

### 播放器模式（当前系统支持）
- `HLS`: M3U8 流媒体
- `IFRAME_DIRECT`: 直接 iframe 嵌入
- `IFRAME_RESOLVER`: 通过解析服务转换

### 相关文件清单
- 菜单组件：`src/components/admin/OperationsSidebar.tsx`
- 采集源管理：`src/components/admin/CollectSourceManager.tsx`
- 分类映射：`src/components/admin/MappingManager.tsx`
- 分类逻辑：`src/lib/collector/category.ts`
- 数据模型：`prisma/schema.prisma`
- API路由：`src/app/api/admin/`、`src/app/api/collect/`
