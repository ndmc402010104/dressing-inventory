/*
檔案位置：dressing-inventory/assets/js/config.js
時間戳記：2026-06-14 10:23 UTC+8
用途：敷料庫存盤點領用系統前端 JS 設定檔。
說明：
- 本檔只放本外部小專案的前端載入設定。
- 不放 skhpsv2 registry card 資料。
- 不放資料庫 endpoint。
- 不放 Apps Script URL。
- 不放密鑰。
- index.html 載入本檔後，由 assets/js/app.js 依 ajaxModules 載入 ajax/*.js。
*/
(function () {
  "use strict";

  window.DressingInventoryConfig = {
    appId: "dressing-inventory",
    appName: "敷料庫存盤點領用系統",
    mode: "mock",
    loadingTask: "dressing-inventory",
    ajaxBasePath: "ajax/",
    ajaxModules: [
      "mock-data.js",
      "log.js",
      "summary.js",
      "inventory.js",
      "inbound.js",
      "stocktake.js",
      "issue.js"
    ],
    features: {
      inventory: true,
      inbound: true,
      stocktake: true,
      issue: true,
      actionLog: true,
      mockData: true
    }
  };
})();
