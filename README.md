# WOS - Whirlbird On Steroids 🎈🚀

**🌐 Languages:** [English](README.md) | [አማርኛ](README.am-AM.md) | [日本語](README.ja-JP.md) | [中文](README.zh-CN.md) | [Русский](README.ru-RU.md)

> A first-person 3D balloon-flying game that lives **inside Reddit** — fly through a metallic space corridor, dodge obstacles, thread arches, rack up points, and publish your score for the whole subreddit to see.

[![Devvit](https://img.shields.io/badge/Devvit-Reddit_Platform-FF4500?logo=reddit)](https://developers.reddit.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.182-000000?logo=threedotjs)](https://threejs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.11-E36002)](https://hono.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vite.dev/)

## 💡 Inspiration

The original **Whirlbird** was a charming side-scrolling balloon game. We cranked it up to 11 — full 3D, first-person perspective, a deep-space corridor, and the social layer of Reddit baked right in.

## 🚀 Quick Start

```bash
cd wirlonsteroid
npm install
npm run login   # connect to Reddit Developer Platform
npm run dev     # launch Devvit playtest
```

> Requires **Node 22+**. See [wirlonsteroid/README.md](wirlonsteroid/README.md) for full documentation.

## ✨ Highlights

| Feature | Details |
|---|---|
| 🎮 **3D Flight** | Chase-cam through a procedurally-spawned space corridor |
| 🏗️ **Lane Obstacles** | Trees, rings, arches across 5 lanes with progressive difficulty |
| 🏆 **Leaderboard** | Top-3 scores via Redis sorted sets |
| 📮 **Publish to Reddit** | One-tap to post your score as a custom Reddit post |
| 🔐 **Security** | Rate limiting, input validation, OWASP headers, no stack leaks |
| 🧪 **27 Chaos Tests** | Boundary values, malformed input, Redis failures, rate hammering |

## 🧰 Built With

[Three.js](https://threejs.org/) · [TypeScript](https://www.typescriptlang.org/) · [Vite](https://vite.dev/) · [Hono](https://hono.dev/) · [Redis](https://redis.io/) · [Devvit](https://developers.reddit.com/) · [Vitest](https://vitest.dev/) · [Playwright](https://playwright.dev/)

## 📄 License

BSD-3-Clause — see [LICENSE](LICENSE).

---

<div align="center">
  <p>Built with ❤️ for the Reddit Games & Puzzles Hackathon</p>
</div> 
