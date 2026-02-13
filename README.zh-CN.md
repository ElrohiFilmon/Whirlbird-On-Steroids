# WOS - Whirlbird On Steroids 🎈🚀

**🌐 语言:** [English](README.md) | [አማርኛ](README.am-AM.md) | [日本語](README.ja-JP.md) | [中文](README.zh-CN.md) | [Русский](README.ru-RU.md)

> **Reddit**内运行的第一人称3D气球飞行游戏 — 穿越金属太空走廊，躲避障碍物，飞过拱门，积累分数，并将成绩发布到整个subreddit。

[![Devvit](https://img.shields.io/badge/Devvit-Reddit_Platform-FF4500?logo=reddit)](https://developers.reddit.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.182-000000?logo=threedotjs)](https://threejs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.11-E36002)](https://hono.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vite.dev/)

## 📖 目录

- [概述](#-概述)
- [功能](#-功能)
- [架构](#-架构)
- [快速开始](#-快速开始)
- [API参考](#-api参考)
- [测试](#-测试)
- [安全性](#-安全性)
- [部署](#-部署)
- [灵感来源](#-灵感来源)
- [面临的挑战](#-面临的挑战)
- [引以为豪的成就](#-引以为豪的成就)
- [学到的知识](#-学到的知识)
- [未来计划](#-未来计划)

---

## 🌟 概述

**WOS (Whirlbird On Steroids)** 是一款构建在 Reddit Devvit 平台上的3D第一人称气球飞行游戏。玩家在金属太空走廊中飞行，穿越拱门，避开障碍物，争取最高分。

- **Three.js 3D渲染**: 支持GLB模型加载的实时第一人称追踪摄像机
- **车道式障碍物系统**: 5车道生成器，带对象池和渐进难度
- **Reddit原生排行榜**: 存储在Redis有序集合中的前3名成绩
- **一键发布**: 从游戏结束画面直接将分数发布为Reddit自定义帖子
- **Devvit平台**: 完全在Reddit内运行 — 无需外部托管

---

## ✨ 功能

### 🎮 3D飞行
- 穿越程序化生成走廊的追踪摄像机
- 桌面端: WASD + 鼠标，移动端: 触控 + 陀螺仪
- 平滑lerp跟随，附带装饰性倾斜和悬浮摆动
- ACES色调映射带来电影级视觉效果

### 🌌 太空环境
- 3000粒子星空，带深度分层
- 发光照明的金属走廊壁面
- 飘浮于场景中的程序化星云
- 距离衰减和氛围雾效

### 🏗️ 车道式障碍物
- 5条车道 (x = -6, -3, 0, 3, 6) 保证可通行路径
- 渐进难度：出现树木、圆环和拱门
- **拱门规则**: 必须穿过拱门 — 未通过 = 游戏结束
- 8级渐进模式，速度从18递增至38
- 对象池在60fps下保持GC静默

### 🏆 排行榜与计分
- Redis有序集合 (O(log N) 更新) 的前3排行榜
- 每用户个人最佳追踪
- 服务器端验证的分数提交 (整数 0-9999)

### 📮 发布到Reddit
- 游戏结束覆盖层上的"发布分数"按钮
- 带分数预览的确认弹窗
- 创建Reddit自定义帖子: `🎈 u/用户名 得了X分！`
- 带"查看帖子"链接的成功画面

### 🔐 安全性
- Content-Type强制 (非JSON返回415)
- 请求体大小限制 (超大载荷返回413)
- 基于Redis时间戳的用户级速率限制
- 用户名清理 (防XSS/注入)
- 安全头 (nosniff, DENY, strict-origin)
- 全局错误处理器防止堆栈跟踪泄露
- 匿名用户发布拦截

---

## 🚀 快速开始

### 前提条件

- [Node.js](https://nodejs.org/) v22.2.0 或更高版本
- [Devvit CLI](https://developers.reddit.com/) (Reddit开发者平台)
- 已连接 [Reddit Developers](https://developers.reddit.com/) 的Reddit账号

### 安装

```bash
git clone https://github.com/elrohi/Whirlbird-On-Steroids.git
cd Whirlbird-On-Steroids/wirlonsteroid
npm install
npm run login
npm run dev
```

### 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动Devvit游戏测试 |
| `npm run build` | 生产环境构建 |
| `npm run deploy` | 类型检查、代码检查、测试并上传 |
| `npm run test` | 运行Vitest混沌和单元测试 |
| `npx playwright test` | 运行Playwright E2E测试 |

---

## 📡 API参考

### 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/init` | 初始化用户名、个人最佳和排行榜 |
| POST | `/api/score` | 提交游戏分数 (整数 0-9999) |
| GET | `/api/leaderboard` | 获取前3名分数 |
| POST | `/api/publish` | 将分数发布为Reddit帖子 |

### 中间件
- 安全头: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- POST/PUT/PATCH 必须使用 `Content-Type: application/json` (415)
- 请求体大小限制256字节 (413)
- 全局错误处理器不泄露堆栈跟踪

---

## 🧪 测试

### 混沌工程测试 (27个测试)
- **分数边界值** — 0, 9999, -1, 10000, NaN, Infinity, 浮点数, 字符串, 缺失
- **畸形请求体** — 错误Content-Type、无效JSON、空体、堆栈跟踪不泄露
- **速率限制** — 快速分数提交、发布节流
- **Redis故障** — GET /init 和 GET /leaderboard 崩溃模拟
- **用户名清理** — XSS载荷、null、溢出
- **匿名发布拦截** — 未认证用户返回401
- **排行榜更新** — 仅更新最高分，不降级

### Playwright E2E测试
- 启动页 (标题、按钮、排行榜)
- 游戏页 (加载、HUD、覆盖层)
- API集成 (Content-Type、JSON、分数验证)

---

## 💡 灵感来源

原版 **Whirlbird** 是一款迷人的侧滚气球游戏。我们思考: *如果把它提升到极限会怎样?* — 全3D，第一人称视角，深空走廊，加上Reddit的社交层。

---

## 🧗 面临的挑战

1. **GLB模型尺寸** — 模型以差异极大的比例加载; 通过 `normalizeModel()` 解决
2. **拱门碰撞检测** — 检测气球是飞*过*还是飞*到*拱门*上方*，需要双区域盒子方案
3. **Devvit平台限制** — 无 `window.alert`，有限DOM API，仅Redis存储
4. **速率限制竞争** — 并发分数提交; 通过Redis时间戳解决
5. **响应式3D** — 在Reddit嵌入式webview中适配FOV、触控和CSS

---

## 🏆 引以为豪的成就

- 完整发布流程: 游玩 → 计分 → 确认 → 帖子出现在动态中
- 27个测试的混沌工程测试套件
- 零 `any` 类型 — 所有接口使用 `readonly` 属性
- 带真实进度条的加载画面
- OWASP合规的安全加固

---

## 📚 学到的知识

- **混沌工程** — 假设驱动的故障注入发现了快乐路径测试忽略的bug
- **页面对象模型** — POM类封装选择器，提升E2E测试可维护性
- **三层API思维** — 在客户端*和*服务器端同时做验证
- **安全优先** — 速率限制、输入验证、头部加固
- 60fps下**对象池**至关重要

---

## 🔮 未来计划

- **更多障碍物类型** — 旋转刀片、移动平台、引力井
- **增益道具** — 护盾、磁铁、加速
- **多人幽灵模式** — 实时显示其他玩家的回放
- **每日挑战** — 带独立排行榜的策划关卡
- **音效设计** — 空间音频
- **成就徽章** — 里程碑对应的Reddit头衔

---

## 🧰 技术栈

| 技术 | 用途 |
|------|------|
| [Three.js](https://threejs.org/) | 3D渲染、GLTFLoader |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全代码 |
| [Vite](https://vite.dev/) | 打包构建 |
| [Hono](https://hono.dev/) | 轻量服务器框架 |
| [Redis](https://redis.io/) | 排行榜、速率限制 |
| [Devvit](https://developers.reddit.com/) | Reddit SDK |
| [Vitest](https://vitest.dev/) | 单元和混沌测试 |
| [Playwright](https://playwright.dev/) | E2E测试 |

---

## 📄 许可证

BSD-3-Clause — 详见 [LICENSE](LICENSE)。

---

<div align="center">
  <p>为 Reddit Games & Puzzles 黑客松用❤️构建</p>
</div>
