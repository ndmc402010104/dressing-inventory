# 敷料庫存盤點領用系統

外部小專案頁面骨架，專案代號 `dressing-inventory`。

本版只建立可單獨開啟、可互動的 AJAX mock shell，不連資料庫、不呼叫 Apps Script、不新增真實 API endpoint。

## 專案結構

```text
dressing-inventory/
  index.html
  config.json
  README.md
  assets/js/config.js
  assets/js/app.js
  ajax/mock-data.js
  ajax/log.js
  ajax/summary.js
  ajax/inventory.js
  ajax/inbound.js
  ajax/stocktake.js
  ajax/issue.js
```

## 檔案責任

- `index.html` 是頁面入口，負責外部 App 身分宣告、頁面容器與暫時 inline CSS。
- `config.json` 是給 skhpsv2 控制台 / external app registry / app-entry 使用的外部專案 card。
- `assets/js/config.js` 是前端載入設定，集中宣告 `ajax/*.js` 模組清單，不放 endpoint、Apps Script URL 或密鑰。
- `assets/js/app.js` 是主控入口，負責建立 namespace、state、utils、載入 AJAX 模組、事件綁定與 loading gate ready。
- `ajax/*.js` 是各工作模式模組，拆分 mock data、庫存、入庫、盤點、領用、摘要與 action log。

## 專案名片

`config.json` 是提供給 skhpsv2 後台、控制台或 external app registry 使用的外部專案名片。它只描述專案身分、入口、顯示資訊與目前 mock 狀態，不是資料庫設定，也不是 mock data 來源。正式啟用與顯示位置由 skhpsv2 後台 / 外部專案 Sheet 決定。

## 本機測試

直接開啟：

```text
dressing-inventory/index.html
```

或在專案資料夾啟動簡單靜態伺服器後瀏覽 `index.html`。

## Mock 範圍

- 敷料基本資料
- 庫存批號、位置、效期、狀態
- 入庫明細新增、移除、暫存、送出
- 盤點列新增、移除、儲存、完成
- 領用明細新增、移除、草稿、送出
- 操作紀錄與診斷訊息

## 後端狀態

目前沒有資料庫、Apps Script、Sheet 或 API endpoint。未來接後端時需依 skhpsv2 共通 backend-client 規範另行設計。
