(function () {
  "use strict";

  const DI = window.DressingInventory;

  function renderLineItems() {
    const { escapeHtml } = DI.utils;
    const rows = DI.state.stocktakeItems;
    if (!rows.length) return `<div class="empty" style="margin-top: 14px;">目前沒有盤點列。</div>`;
    return `
      <div class="table-wrap" style="margin-top: 14px;">
        <table>
          <thead><tr><th>院內碼</th><th>敷料名稱</th><th>位置</th><th>批號</th><th>系統</th><th>實際</th><th>差異</th><th>原因</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)} ${escapeHtml(row.spec)}</td><td>${escapeHtml(row.location)}</td><td>${escapeHtml(row.lot)}</td><td>${row.systemQty}</td><td>${row.actualQty}</td><td>${row.diff}</td><td>${escapeHtml(row.reason)}</td><td><button class="danger-button" type="button" data-remove-stocktake="${row.id}">移除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStocktake() {
    const { $, optionList } = DI.utils;
    $("workspaceArea").innerHTML = `
      <h2>盤點</h2>
      <div class="field-grid">
        <label>盤點位置
          <select id="stocktakeLocation">${optionList(DI.mock.locations, "5A")}</select>
        </label>
        <label>掃描或輸入條碼 / 院內碼 / 批號
          <input id="stocktakeCode" placeholder="條碼、院內碼或批號">
        </label>
        <label>系統庫存 mock
          <input id="stocktakeSystemQty" readonly placeholder="mock 自動帶入">
        </label>
        <label>實際庫存
          <input id="stocktakeActualQty" type="number" min="0" value="0">
        </label>
        <label>差異數量
          <input id="stocktakeDiff" readonly value="0">
        </label>
        <label>差異原因
          <select id="stocktakeReason">${optionList(["正常消耗", "破損", "過期", "找不到", "其他"], "正常消耗")}</select>
        </label>
        <label class="span-3">備註
          <textarea id="stocktakeNote" placeholder="盤點備註"></textarea>
        </label>
      </div>
      <div class="action-row">
        <button class="primary" type="button" data-action="addStocktakeItem">新增盤點列</button>
        <button class="secondary" type="button" data-action="saveStocktake">mock 儲存盤點</button>
        <button class="primary" type="button" data-action="completeStocktake">mock 完成盤點</button>
      </div>
      ${renderLineItems()}
    `;
  }

  function findStocktakeInventory() {
    const { $ } = DI.utils;
    const input = $("stocktakeCode")?.value || "";
    return DI.utils.findBestInventory(input, $("stocktakeLocation")?.value) ||
      DI.mock.mockInventory.find((row) => row.lot.toLowerCase() === input.trim().toLowerCase());
  }

  function fillStocktakeFields() {
    const { $ } = DI.utils;
    const inventory = findStocktakeInventory();
    if (!inventory) return;
    $("stocktakeSystemQty").value = inventory.quantity;
    $("stocktakeDiff").value = Number($("stocktakeActualQty").value || 0) - inventory.quantity;
  }

  function addStocktakeItem() {
    const { $, rowId } = DI.utils;
    const inventory = findStocktakeInventory();
    if (!inventory) return DI.modules.log.setError("找不到對應的 mock 庫存，請輸入院內碼、條碼或批號。");
    const actualQty = Number($("stocktakeActualQty").value || 0);
    const item = {
      id: rowId("stocktake"),
      code: inventory.code,
      name: inventory.name,
      spec: inventory.spec,
      location: $("stocktakeLocation").value,
      lot: inventory.lot,
      systemQty: inventory.quantity,
      actualQty,
      diff: actualQty - inventory.quantity,
      reason: $("stocktakeReason").value,
      note: $("stocktakeNote").value
    };
    DI.state.stocktakeItems.push(item);
    DI.state.stocktakeStatus = "已新增盤點列";
    DI.modules.log.setSuccess(`已新增盤點：${item.name} 差異 ${item.diff}`, false);
    DI.modules.log.appendLog(`新增盤點列：${item.code} ${item.name} 差異 ${item.diff}`, item.diff === 0 ? "success" : "warn");
  }

  function removeStocktakeItem(rowIdValue) {
    DI.state.stocktakeItems = DI.state.stocktakeItems.filter((row) => row.id !== rowIdValue);
    DI.modules.log.appendLog("移除盤點列", "warn");
    DI.renderApp();
  }

  function saveStocktake() {
    DI.state.stocktakeStatus = "mock 儲存成功";
    DI.modules.log.setSuccess(`已 mock 儲存 ${DI.state.stocktakeItems.length} 筆盤點列`, false);
    DI.modules.log.appendLog("mock save success：盤點儲存", "success");
  }

  function completeStocktake() {
    DI.state.stocktakeStatus = "mock 完成盤點";
    DI.modules.log.setSuccess(`已 mock 完成盤點，有差異 ${DI.state.stocktakeItems.filter((row) => row.diff !== 0).length} 筆`, false);
    DI.modules.log.appendLog("mock submit success：完成盤點", "success");
  }

  DI.modules.stocktake = {
    renderStocktake,
    addStocktakeItem,
    removeStocktakeItem,
    saveStocktake,
    completeStocktake,
    fillStocktakeFields
  };
})();
