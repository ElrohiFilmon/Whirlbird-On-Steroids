# WOS - Whirlbird On Steroids 🎈🚀

**🌐 言語:** [English](README.md) | [አማርኛ](README.am-AM.md) | [日本語](README.ja-JP.md) | [中文](README.zh-CN.md) | [Русский](README.ru-RU.md)

> **Reddit**の中で遊べる一人称視点の3Dバルーン飛行ゲーム — メタリックな宇宙回廊を飛び抜け、障害物を避け、アーチをくぐり、ポイントを稼ぎ、スコアをサブレディット全体に公開しよう。

[![Devvit](https://img.shields.io/badge/Devvit-Reddit_Platform-FF4500?logo=reddit)](https://developers.reddit.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.182-000000?logo=threedotjs)](https://threejs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.11-E36002)](https://hono.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vite.dev/)

## 📖 目次

- [概要](#-概要)
- [機能](#-機能)
- [アーキテクチャ](#-アーキテクチャ)
- [はじめに](#-はじめに)
- [APIリファレンス](#-apiリファレンス)
- [テスト](#-テスト)
- [セキュリティ](#-セキュリティ)
- [デプロイ](#-デプロイ)
- [インスピレーション](#-インスピレーション)
- [直面した課題](#-直面した課題)
- [誇りに思う成果](#-誇りに思う成果)
- [学んだこと](#-学んだこと)
- [今後の予定](#-今後の予定)

---

## 🌟 概要

**WOS (Whirlbird On Steroids)** は、Reddit Devvitアプリとして構築された3D一人称視点バルーン飛行ゲームです。プレイヤーはメタリックな宇宙回廊を飛行し、アーチをくぐり、障害物を避けて最高スコアを目指します。

- **Three.js 3Dレンダリング**: GLBモデルローディング付きリアルタイム一人称チェイスカメラ
- **レーンベース障害物システム**: オブジェクトプーリングと段階的難易度を持つ5レーンスポナー
- **Reddit ネイティブリーダーボード**: Redisソート済みセットに保存されたトップ3スコア
- **ワンタップ公開**: ゲームオーバー画面から直接スコアをRedditカスタム投稿として公開
- **Devvitプラットフォーム**: Reddit内で完全に動作 — 外部ホスティング不要

---

## ✨ 機能

### 🎮 3Dフライト
- プロシージャル生成された回廊を通るチェイスカメラ
- デスクトップ: WASD + マウス、モバイル: タッチ + チルト
- 滑らかなlerp追従とコスメティックチルト・ホバーボブ
- ACESフィルミックトーンマッピングによる映画的ビジュアル

### 🌌 宇宙環境
- 深度レイヤー付き3000パーティクルスターフィールド
- エミッシブライティング付きメタリック回廊壁
- シーンを漂うプロシージャルネビュラクラウド
- 距離フェードと雰囲気のためのフォグ

### 🏗️ レーンベース障害物
- 5レーン (x = -6, -3, 0, 3, 6) でプレイ可能なパスを保証
- 段階的難易度でツリー、リング、アーチが出現
- **アーチルール**: アーチは*くぐらなければならない* — 通過しない = ゲームオーバー
- スピードランプ (18 → 38) 付き8段階プログレッシブパターン
- オブジェクトプーリングで60fpsでもGCを静かに維持

### 🏆 リーダーボードとスコアリング
- Redisソート済みセット (O(log N) アップサート) によるトップ3リーダーボード
- ユーザーごとの自己ベスト追跡
- サーバーサイドバリデーション付きスコア送信 (整数 0-9999)

### 📮 Redditへ公開
- 「スコアを投稿」ボタン付きゲームオーバーオーバーレイ
- スコアプレビュー付き確認モーダル
- Redditカスタム投稿を作成: `🎈 u/ユーザー名 がX点をスコア!`
- 「投稿を見る」リンク付き成功画面

### 🔐 セキュリティ
- Content-Type強制 (非JSONに415)
- ボディサイズ制限 (過大ペイロードに413)
- Redisタイムスタンプによるユーザーごとのレート制限
- ユーザー名サニタイゼーション (XSS/インジェクション防止)
- セキュリティヘッダー (nosniff, DENY, strict-origin)
- スタックトレースリーク防止のグローバルエラーハンドラー
- 匿名ユーザーの公開ブロック

---

## 🚀 はじめに

### 前提条件

- [Node.js](https://nodejs.org/) v22.2.0 以降
- [Devvit CLI](https://developers.reddit.com/) (Reddit Developer Platform)
- [Reddit Developers](https://developers.reddit.com/) に接続されたRedditアカウント

### インストール

```bash
git clone https://github.com/elrohi/Whirlbird-On-Steroids.git
cd Whirlbird-On-Steroids/wirlonsteroid
npm install
npm run login
npm run dev
```

### ビルドコマンド

| コマンド | 説明 |
|---------|-------------|
| `npm run dev` | Devvitプレイテストを開始 |
| `npm run build` | プロダクション用にビルド |
| `npm run deploy` | 型チェック、リント、テスト、アップロード |
| `npm run test` | Vitestカオス＆ユニットテストを実行 |
| `npx playwright test` | Playwright E2Eテストを実行 |

---

## 📡 APIリファレンス

### エンドポイント

| メソッド | パス | 説明 |
|--------|------|-------------|
| GET | `/api/init` | ユーザー名、自己ベスト、リーダーボードでブートストラップ |
| POST | `/api/score` | ゲームスコアを送信 (整数 0-9999) |
| GET | `/api/leaderboard` | トップ3スコアを取得 |
| POST | `/api/publish` | スコアをReddit投稿として公開 |

### ミドルウェア
- セキュリティヘッダー: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- POST/PUT/PATCHには `Content-Type: application/json` が必須 (415)
- ボディサイズ256バイト制限 (413)
- スタックトレースを漏洩しないグローバルエラーハンドラー

---

## 🧪 テスト

### カオスエンジニアリングテスト (27テスト)
- **スコア境界値** — 0, 9999, -1, 10000, NaN, Infinity, 浮動小数点, 文字列, 欠落
- **不正なボディ** — 不正なContent-Type、無効なJSON、空ボディ、スタックトレース非漏洩
- **レート制限** — 高速スコア送信、公開スロットリング
- **Redis障害** — GET /init と GET /leaderboardでのクラッシュシミュレーション
- **ユーザー名サニタイゼーション** — XSSペイロード、null、オーバーフロー
- **匿名公開ブロック** — 未認証ユーザーに401
- **リーダーボードアップサート** — ダウングレードせず、最高スコアのみ更新

### Playwright E2Eテスト
- スプラッシュページ (タイトル、ボタン、リーダーボード)
- ゲームページ (ローディング、HUD、オーバーレイ)
- API統合 (Content-Type、JSON、スコア検証)

---

## 💡 インスピレーション

オリジナルの**Whirlbird**は魅力的なサイドスクロールバルーンゲームでした。私たちは問いました: *11に上げたらどうなる?* — フル3D、一人称視点、ディープスペース回廊、そしてRedditのソーシャルレイヤーを組み込みました。

---

## 🧗 直面した課題

1. **GLBモデルサイジング** — モデルは大きく異なるスケールで提供; `normalizeModel()` で解決
2. **アーチ衝突検出** — バルーンがアーチの*中を*飛んだか*上を*飛んだかの検出にツーゾーンボックスアプローチが必要
3. **Devvitプラットフォーム制約** — `window.alert` なし、限定DOM API、Redis限定ストレージ
4. **レート制限競合** — 同時スコア送信; Redisタイムスタンプで解決
5. **レスポンシブ3D** — FOV、タッチ、CSSをReddit埋め込みウェブビュー内で動作させる

---

## 🏆 誇りに思う成果

- 完全な公開フロー: プレイ → スコア → 確認 → 投稿がフィードに表示
- 27テストのカオスエンジニアリングスイート
- `any` 型ゼロ — すべてのインターフェースに `readonly` プロパティ
- 実際のプログレスバー付きローディング画面
- OWASP準拠セキュリティ強化

---

## 📚 学んだこと

- **カオスエンジニアリング** — 仮説駆動の障害注入がハッピーパステストでは見つからないバグを発見
- **ページオブジェクトモデル** — POMクラスでセレクターをカプセル化しE2Eテストの保守性を向上
- **三層APIシンキング** — クライアント*と*サーバーの両方でバリデーション
- **ファーストクラスのセキュリティ** — レート制限、入力検証、ヘッダー強化
- 60fpsでは**オブジェクトプーリング**が重要

---

## 🔮 今後の予定

- **障害物タイプ追加** — 回転ブレード、移動プラットフォーム、重力井戸
- **パワーアップ** — シールド、マグネット、スピードブースト
- **マルチプレイヤーゴースト** — 他プレイヤーのリプレイをリアルタイムで表示
- **デイリーチャレンジ** — ユニークなリーダーボード付きキュレーションシーケンス
- **サウンドデザイン** — 空間オーディオ
- **実績バッジ** — マイルストーン達成のRedditフレア

---

## 🧰 使用技術

| 技術 | 役割 |
|---|---|
| [Three.js](https://threejs.org/) | 3Dレンダリング、GLTFLoader |
| [TypeScript](https://www.typescriptlang.org/) | 型安全なコード |
| [Vite](https://vite.dev/) | バンドリング、ビルド |
| [Hono](https://hono.dev/) | 軽量サーバーフレームワーク |
| [Redis](https://redis.io/) | リーダーボード、レート制限 |
| [Devvit](https://developers.reddit.com/) | Reddit SDK |
| [Vitest](https://vitest.dev/) | ユニット＆カオステスト |
| [Playwright](https://playwright.dev/) | E2Eテスト |

---

## 📄 ライセンス

BSD-3-Clause — [LICENSE](LICENSE) をご覧ください。

---

## 📄 試してみて、また追加してください
[WOS](https://www.reddit.com/r/wirlonsteroid_dev/)
[WOS](https://developers.reddit.com/apps/wirlonsteroid)

<div align="center">
  <p>Reddit Games & Puzzles ハッカソンのために❤️で構築</p>
</div>
