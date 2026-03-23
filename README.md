# TokyoWalkLog

Apache Cordova 製の Android アプリ。外部 API から取得した JSON データをもとに、東京の歩行ログ・鉄道駅・寺社仏閣をインタラクティブな地図と表形式で表示します。

---

## アプリ情報

| 項目 | 値 |
|---|---|
| アプリ名 | TokyoWalkLog |
| パッケージ ID | com.example.tokyowalklog |
| バージョン | 1.0.0 |
| ライセンス | Apache-2.0 |

---

## 対応プラットフォーム

- **Android** (cordova-android ^14.0.1)
- **Browser** (cordova-browser ^7.0.0)

---

## 主な機能

| 画面 | 説明 |
|---|---|
| **ホーム (index)** | 日付別の歩行ログ一覧（件数・面積 km²）を表示。マップ・駅・寺社各画面へのナビゲーション付き |
| **マップ (map)** | Leaflet.js を使用した地図上に歩行ルートを表示 |
| **東京駅一覧 (tokyoTrainStation)** | 路線ごとの駅リストを表示・地図上にピン表示 |
| **周辺駅 (stationAround)** | 指定地点から半径内の駅を地図上に表示 |
| **寺社仏閣一覧 (templeLatLng)** | ランク付き寺社仏閣の一覧を表示 |
| **周辺寺社仏閣 (templeAround)** | 指定地点から半径内の寺社仏閣を地図上に表示 |

---

## 使用ライブラリ・プラグイン

| 名前 | バージョン | 用途 |
|---|---|---|
| [Leaflet.js](https://leafletjs.com/) | 1.9.4 | インタラクティブ地図表示 |
| cordova-plugin-splashscreen | ^6.0.1 | スプラッシュスクリーン |

---

## 外部 API

| エンドポイント | 説明 |
|---|---|
| `http://49.212.175.205:3000/api/v1/geoloc` | 日時・緯度経度の歩行ログデータ |
| `http://toyohide.work/BrainLog/api/getTokyoTrainStation` | 東京の路線・駅情報 |
| `http://toyohide.work/BrainLog/api/getTempleLatLng` | 寺社仏閣の座標・ランク情報 |

---

## Android 設定 (config.xml)

| 設定項目 | 値 |
|---|---|
| scheme | http |
| hostname | localhost |
| usesCleartextTraffic | true |
| SplashScreenDelay | 2000 ms |
| AutoHideSplashScreen | true |
| FadeSplashScreen | true |

---

## プロジェクト構成

```
cordova_json_sample_5/
├── app/
│   ├── config.xml          # Cordova 設定ファイル
│   ├── package.json        # npm / Cordova 依存関係
│   └── www/
│       ├── index.html      # メイン画面
│       ├── map.html        # マップ画面
│       ├── home.html       # ホーム画面
│       ├── tokyoTrainStation.html  # 東京駅一覧
│       ├── stationAround.html      # 周辺駅
│       ├── templeLatLng.html       # 寺社仏閣一覧
│       ├── templeAround.html       # 周辺寺社仏閣
│       ├── css/            # スタイルシート
│       ├── js/             # JavaScript ロジック
│       ├── img/            # 画像リソース
│       └── res/            # アイコン・スプラッシュ画像
└── data.txt                # API レスポンスのサンプルデータ
```

---

## セットアップ・ビルド

```bash
# 依存関係インストール
cd app
npm install

# Android ビルド
npx cordova build android

# ブラウザで実行
npx cordova run browser
```
