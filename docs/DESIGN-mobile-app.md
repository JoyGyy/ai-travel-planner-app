# AI 旅行规划助手 App 端详细设计说明书 (Detailed Design Document)

> **版本**：v1.0.0  
> **编写日期**：2026-09-09  
> **文档状态**：已批准进入实施 (Approved for Implementation)  
> **对应工程**：`ai-travel-planner-app` (Expo 57 / React Native 0.86) 与 `ai-travel-planner` (Next.js 16)  
> **依据需求**：[PRD-mobile-app.md](./PRD-mobile-app.md)

---

## 1. 架构总览与设计原则

### 1.1 总体架构分层
整个移动端系统采用分层松耦合架构，严格遵循**关注点分离（SoC）**原则：

```text
┌─────────────────────────────────────────────────────────────┐
│                 Presentation Layer (UI/UX)                   │
│   Expo Router (Tabs / Stacks) + Reanimated 4 + Haptics      │
│   Journal UI Components (PaperCard, StampBadge, Timeline)   │
├─────────────────────────────────────────────────────────────┤
│                  Domain & State Layer                       │
│   Zustand Stores (Auth, Chat, Itinerary, Attractions)       │
│   Local Persistence (SecureStore + AsyncStorage)            │
├─────────────────────────────────────────────────────────────┤
│                Infrastructure & Network Layer               │
│   HTTP Client (Bearer Auth, Error Handling, AbortController)│
│   SSE Stream Parser (Typewriter chunking, Line buffer)      │
│   Native Capabilities (expo-location, expo-haptics)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST / SSE Stream
┌──────────────────────────────▼──────────────────────────────┐
│             Backend Services (ai-travel-planner)             │
│   Next.js 16 Route Handlers (/api/*) + PostgreSQL           │
│   ReAct AI Agent + DeepSeek/SiliconFlow + RAG Vector Store  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则
1. **模块化实施与测试先行**：每个模块独立成包，具备清晰的输入输出、状态契约及对应单元测试，杜绝巨石式代码堆砌。
2. **手账美学贯穿始终**：设计系统以温暖纸质色调、手写字体感觉、明信片拍立得、微触感图章为核心视觉资产，保持高辨识度。
3. **渐进式鉴权与在途高可用**：免登录友好体验，关键行程数据双写本地（AsyncStorage），断网环境自动降级使用离线快照。
4. **流式打字与响应式阻断**：AI 对话采用 SSE 事件流，支持随时手动中止（AbortController），兼顾长文本生成性能与电池损耗。

---

## 2. 模块划分与实施设计

项目按职责严格拆分为 9 个工程实施模块，遵循由下而上、前置依赖先行的交付逻辑：

```text
[模块 1: 后端 Bearer 鉴权兼容] ──► [模块 2: App 基础库与网络层] ──► [模块 3: 用户鉴权与安全存储]
                                                                        │
                                                                        ▼
[模块 6: AI 对话流式规划]    ◄── [模块 5: 首页灵感与定位天气]   ◄── [模块 4: 手账设计系统与 Tab]
         │
         ▼
[模块 7: 行程手账与离线缓存]  ──► [模块 8: 景点探索与收藏]       ──► [模块 9: 个人中心与全局验收]
```

---

### 模块 1：服务端 Bearer Token 兼容改造与测试
- **所属项目**：`ai-travel-planner`
- **设计目标**：在完全不破坏现有 Web 端 Cookie + CSRF 机制的前提下，使全站 API 支持移动端标准的 `Authorization: Bearer <token>` 请求头。
- **改动范围**：
  1. `src/lib/services/auth.ts`:
     - 修改 `getAuthFromHeaders(headers: Headers)`：优先判断 `headers.get('authorization')?.startsWith('Bearer ')`，提取 JWT 串并调用 `verifyToken`；未携带时回退读取 Cookie。
  2. `src/lib/utils/http.ts`:
     - 修改 `requireCsrf(req: Request)`：若请求头包含合法的 Bearer Token，说明为原生移动客户端请求，自动跳过浏览器专用的 Double-Submit Cookie CSRF 拦截。
- **单元测试方案**：
  - 扩展 `src/lib/services/auth.test.ts`：增加 Bearer Token 成功验证、过期 Token、伪造 Token 的单测用例。
  - 扩展 `src/lib/utils/http.test.ts`：验证携带 Bearer Token 时 CSRF 免检通过、未带 Token 时依然严格执行 CSRF 校验。

---

### 模块 2：App 基础设施与网络请求层
- **所属项目**：`ai-travel-planner-app`
- **依赖选型**：
  - `zustand`: 全局轻量状态流。
  - `expo-secure-store`: 敏感密钥硬件级加密存储。
  - `@react-native-async-storage/async-storage`: 大容量离线数据与配置持久化。
  - `@expo/vector-icons`: 矢量图标集（Ionicons, MaterialCommunityIcons）。
  - `expo-location`: 设备地理位置。
  - `expo-haptics`: 原生震动反馈。
- **网络客户端设计 (`src/services/api-client.ts`)**：
  - **环境配置**：读取 `process.env.EXPO_PUBLIC_API_URL`，默认支持本地开发局域网 IP（`http://192.168.x.x:3000`）与线上域名。
  - **请求拦截**：从 `AuthStorage` 异步获取 JWT Token，自动在 Headers 中追加 `Authorization: Bearer <token>` 与 `Content-Type: application/json`。
  - **错误统一包装**：将 401 状态码映射为 `UnauthorizedError`，403/429/500 包装为带中文提示的 `ApiError`。
- **安全存储抽象 (`src/services/auth-storage.ts`)**：
  - 封装 `saveToken(token: string)`、`getToken(): Promise<string | null>`、`removeToken()`。
- **测试用例**：
  - `api-client.test.ts`: 模拟 `fetch`，验证 BaseUrl 拼接、Bearer Token 注入、401 抛错逻辑。
  - `auth-storage.test.ts`: 模拟 SecureStore 读写删流程。

---

### 模块 3：用户鉴权与状态管理 (Auth Module)
- **设计规范**：
  - **状态模型 (`src/stores/use-auth-store.ts`)**：
    ```typescript
    interface AuthState {
      user: UserProfile | null;
      token: string | null;
      isLoading: boolean;
      isAuthenticated: boolean;
      login: (credentials: LoginParams) => Promise<void>;
      register: (params: RegisterParams) => Promise<void>;
      logout: () => Promise<void>;
      initAuth: () => Promise<void>;
    }
    ```
  - **界面流转**：
    - `src/app/(auth)/login.tsx`：手账质感登录表单（用户名、密码），提供快速切换至注册。
    - `src/app/(auth)/register.tsx`：新用户注册，自动登录并同步状态。
    - 采用模态全屏栈（`Stack.Screen options={{ presentation: 'modal' }}`），完成操作后自动 `router.back()`。
- **测试用例**：
  - `use-auth-store.test.ts`: 验证初始静默读取 Token、登录成功更新状态、退出登录清空存储。

---

### 模块 4：手账美学设计系统与 Tab 导航框架
- **设计主题规范 (`src/constants/theme.ts`)**：
  ```typescript
  export const JournalTheme = {
    colors: {
      background: '#FAF8F5',      // 温暖米白纸质底
      surface: '#FFFFFF',         // 纯白手账卡片
      primary: '#E07A5F',         // 暖金赤陶主色
      secondary: '#3D5A80',       // 邮戳深蓝
      accent: '#2A9D8F',          // 森林绿（大自然）
      textPrimary: '#2B2D42',     // 炭黑字墨水感
      textSecondary: '#8D99AE',   // 浅铅灰次级文字
      border: '#E8E1D9',          // 纸张微边框
      stampRed: '#C94A4A',        // 印章红
    },
    radii: {
      sm: 8,
      md: 14,
      lg: 20,
      full: 9999,
    },
  };
  ```
- **核心组件库 (`src/components/journal/`)**：
  1. `JournalCard.tsx`: 具温暖纸张投影、细微米色描边的容器卡片。
  2. `StampBadge.tsx`: 仿复古图章印记，支持 `type: 'verified' | 'visited' | 'saved'`，带轻微倾斜角度。
  3. `JournalButton.tsx`: 原生触控按钮，支持点击微缩放动效与触觉反馈。
- **导航框架 (`src/app/(tabs)/_layout.tsx`)**：
  - 4 个基础 Tab：`index` (首页/灵感), `chat` (AI 规划), `explore` (发现/景点), `profile` (我的)。
  - 底部 TabBar 采用半透明暖色毛玻璃效果。
- **测试用例**：
  - `JournalCard.test.tsx`: 验证样式与子组件渲染。
  - `StampBadge.test.tsx`: 验证不同状态徽章与动画参数。

---

### 模块 5：首页灵感与定位天气模块 (Home Tab)
- **主要逻辑**：
  1. **定位与天气**：
     - 使用 `expo-location` 触发 `requestForegroundPermissionsAsync`，获取经纬度匹配当前城市。
     - 调用后端 `/api/weather?city={cityName}` 获取天气数据（温度、状况、穿衣指数），显示在手账天气小部件中。
  2. **灵感胶囊滚动栏**：
     - 展示预置推荐（如“3日小众慢游”、“春日海岛特种兵”等）。
     - 点击任一胶囊，将 prompt 通过参数路由推送至 `chat` 页面：`router.push({ pathname: '/chat', params: { prompt } })`。
  3. **精选目的地卡片流**：
     - 展示目的地城市手账大卡片（城市封面、特色标签、推荐理由）。
- **测试用例**：
  - `weather.test.ts`: 天气数据解析与未授权定位时的 Fallback 降级。
  - `home.test.tsx`: 首页胶囊点击跳转参数校验。

---

### 模块 6：AI 旅行规划流式对话模块 (Chat Tab) —— ★核心引擎
- **SSE 流式数据协议解析 (`src/services/chat-stream.ts`)**：
  - 后端 `/api/travel/chat` 输出为标准 SSE（Server-Sent Events）格式。
  - 数据块包含：`data: {"type":"chunk","content":"..."}`、`data: {"type":"thought","content":"..."}`（思考过程）、`data: {"type":"plan","content":{...}}`（结构化行程 JSON）。
  - 使用原生 `fetch` 与 `ReadableStream` 或基于分块缓冲区的正则解析器，将收到的文本流平滑拼装为消息序列。
- **聊天状态管理器 (`src/stores/use-chat-store.ts`)**：
  - 维护 `messages: ChatMessage[]`、`isGenerating: boolean`、`abortController: AbortController | null`。
  - 具备 `sendMessage(content: string)`、`stopGenerating()`、`clearSession()` 方法。
- **UI 呈现 (`src/app/(tabs)/chat.tsx`)**：
  - **用户消息气泡**：暖金色手账气泡贴右。
  - **AI 助手气泡**：左侧展示，包含折叠式思考过程（Thinking 灰色卡片）与打字机正文。
  - **结构化行程手账卡**：当解析出完整的行程 JSON 时，在消息末尾自动挂载精美的手账行程卡（包含总天数、预算、核心路线、`[展开完整日程]` 与 `[保存行程]` 按钮）。
- **测试用例**：
  - `chat-stream.test.ts`: 模拟分段 SSE Chunk 推送，验证正文与思考过程的准确拼装。
  - `use-chat-store.test.ts`: 验证发送消息状态流转、中断生成响应。

---

### 模块 7：行程手账详情与离线管理模块 (Itinerary & Offline)
- **数据结构与持久化 (`src/stores/use-itinerary-store.ts`)**：
  - `ItineraryPlan`: 包含 `id`、`title`、`destination`、`days: ItineraryDay[]`、`budget`、`createdAt`。
  - `ItineraryDay`: 包含 `dayNumber`、`date`、`nodes: ItineraryNode[]`（时间、地点、交通、标签、是否打卡盖章）。
  - 双重存储：保存行程时，先写入本地 `AsyncStorage` 的 `@saved_itineraries`，若在线则同时同步至后端 `/api/travel/share`。
- **页面设计 (`src/app/itinerary/[id].tsx`)**：
  - **手账看板**：顶部展示拍立得风格目的地头图、印章与行程概览。
  - **时间轴列表**：每日早/中/晚打卡路线，点击地点可切换打卡状态并触发 `expo-haptics` 印章盖印震动。
  - **离线提示条**：若当前处于无网络环境，顶部显示“离线浏览模式”徽章。
- **测试用例**：
  - `use-itinerary-store.test.ts`: 验证行程存储、离线加载、打卡状态更新、本地删除。

---

### 模块 8：发现与景点探索模块 (Explore Tab)
- **服务层 (`src/services/attractions-service.ts`)**：
  - `getCities()`: 获取城市列表与热门筛选。
  - `getAttractions(cityId?, category?, keyword?)`: 景点列表与分页检索。
  - `toggleFavorite(attractionId)`: 切换收藏状态。
- **页面组件 (`src/app/(tabs)/explore.tsx`)**：
  - 顶部城市与分类水平滚动 Chip 栏。
  - 搜索栏（带防抖输入）。
  - 双列/单列景点手账瀑布流卡片。
  - 收藏爱心按钮：点击触发 Medium Haptic 反馈，支持未登录平滑拦截。
- **详情弹窗 (`src/app/attraction/[id].tsx`)**：
  - 景点大图、开放时间、门票建议、一键发起针对该景点的 AI 定制游。
- **测试用例**：
  - `attractions-service.test.ts`: 验证接口入参构造与返回映射。
  - `explore.test.tsx`: 验证搜索筛选与收藏状态切换。

---

### 模块 9：个人中心与全链路集成验收 (Profile & Polish)
- **页面设计 (`src/app/(tabs)/profile.tsx`)**：
  - **用户卡片**：已登录展示头像与昵称；未登录展示“登录/注册以同步行程”按钮。
  - **数据看板**：已保存行程数、收藏景点数。
  - **我的行程与收藏列表**：支持点击直接跳转详情。
  - **本地缓存管理**：展示当前离线行程占用空间，提供一键清除缓存。
- **全局打磨与验收**：
  - 全局错误边界（ErrorBoundary）与网络重试提示。
  - 启动屏幕（Splash Screen）与平滑隐藏。
  - 双端运行验证（TypeScript 无报错、Jest 自动化测试全部通过）。

---

## 3. 数据模型与接口契约规范

### 3.1 核心类型定义 (TypeScript)
```typescript
// 用户模型
export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;
  role?: string;
}

// 结构化行程模型
export interface ItineraryPlan {
  id: string;
  title: string;
  destination: string;
  totalDays: number;
  estimatedBudget: {
    total: number;
    currency: string;
    breakdown: { category: string; amount: number }[];
  };
  summary: string;
  days: {
    day: number;
    theme: string;
    nodes: {
      id: string;
      time: string;
      placeName: string;
      description: string;
      transport?: string;
      visited?: boolean;
    }[];
  }[];
  createdAt: number;
}
```

### 3.2 API 交互总表
| 业务分类 | 端点路径 | 方法 | 鉴权要求 | 移动端处理策略 |
| :--- | :--- | :--- | :--- | :--- |
| 认证-登录 | `/api/auth/login` | `POST` | 公开 | 返回 JWT，存入 SecureStore |
| 认证-注册 | `/api/auth/register` | `POST` | 公开 | 注册成功自动写入 Token |
| 认证-当前用户 | `/api/auth/me` | `GET` | Bearer Token | 启动时验证 Token 有效性 |
| AI-流式规划 | `/api/travel/chat` | `POST` | 可选/Bearer | SSE 流式接收，带 AbortController |
| 景点-城市列表 | `/api/cities` | `GET` | 公开 | 离线可缓存至 AsyncStorage |
| 景点-列表检索 | `/api/attractions` | `GET` | 公开 | 支持城市与分类多维查询 |
| 景点-收藏状态 | `/api/attractions/[id]/favorite` | `POST` | Bearer Token | 收藏成功触发 Haptic 反馈 |
| 天气查询 | `/api/weather?city=...` | `GET` | 公开 | 配合 GPS 坐标反查实时展现 |

---

## 4. 测试与质量保证策略

### 4.1 测试分层体系
1. **单元测试 (Unit Tests)**：
   - 使用 `jest` + `@testing-library/react-native`。
   - 覆盖所有工具函数、状态 Store、网络拦截器、SSE 解析器。
   - 保证核心逻辑代码单测覆盖率达到关键路径 100%。
2. **组件与渲染测试 (Component Tests)**：
   - 验证手账卡片、印章动画组件在不同 props 下的渲染稳定性。
3. **服务端兼容性回归测试**：
   - 在 `ai-travel-planner` 中使用 `vitest` 运行全套测试，确保修改 `auth.ts` / `http.ts` 后现有 Web 端功能 0 破坏。

### 4.2 质量卡点规范
- 任何模块在提交前必须满足：
  1. `npm test`（或 `pnpm test:run`）测试全部通过，无失败用例。
  2. TypeScript 严格类型检查通过（无 `any` 滥用，无类型错误）。
  3. 代码符合 ESLint 规范。

---

## 5. 总结与执行交付顺序

所有模块将严格按照以下次序闭环执行：
1. **[模块 1]** 后端 `auth.ts` 与 `http.ts` 改造支持 Bearer Token，并通过 Vitest 测试。
2. **[模块 2]** App 安装必要基础设施依赖，构建 `api-client`、`auth-storage` 及单元测试。
3. **[模块 3]** App 实现 `useAuthStore`、登录注册界面与测试。
4. **[模块 4]** App 落地手账设计系统与 4-Tab 导航结构及测试。
5. **[模块 5]** App 实现首页灵感、定位与天气组件。
6. **[模块 6]** App 实现 SSE 流式 AI 旅行规划对话与行程摘要手账卡及测试。
7. **[模块 7]** App 实现行程手账详情、Day-by-Day 时间轴与离线存储及测试。
8. **[模块 8]** App 实现景点探索、城市筛选与轻触收藏及测试。
9. **[模块 9]** App 实现个人中心、缓存管理与双端全链路综合验收。

