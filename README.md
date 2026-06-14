# 敷料庫存盤點領用系統

外部小專案頁面骨架，專案代號 `dressing-inventory`。

本版只建立可單獨開啟、可互動的 AJAX mock shell，不連資料庫、不呼叫 Apps Script、不新增真實 API endpoint。

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

## 未來 API 建議

- `GET /api/dressings`
- `GET /api/inventory?location=&status=&q=`
- `POST /api/inbound/drafts`
- `POST /api/inbound/submit`
- `POST /api/stocktakes/drafts`
- `POST /api/stocktakes/complete`
- `POST /api/issues/drafts`
- `POST /api/issues/submit`
- `GET /api/staff`
- `GET /api/doctors`
