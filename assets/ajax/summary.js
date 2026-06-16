(function () {
  "use strict";

  const DI = window.DressingInventory;

  function sum(rows, key) {
    return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  }

  function appManifest() {
    return window.SKHPS_APP_EFFECTIVE_MANIFEST || window.SKHPS_APP_MANIFEST || {};
  }

  function inventoryRules() {
    const rules = appManifest().inventoryRules;
    return Object.assign({
      lowStockQuantityLessThanOrEqual: 10,
      expiringWithinDays: 90
    }, rules || {});
  }

  function aggregateByCode(rows) {
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.code)) {
        map.set(row.code, {
          code: row.code,
          quantity: 0,
          expiries: []
        });
      }
      const item = map.get(row.code);
      item.quantity += Number(row.quantity || 0);
      item.expiries.push(row.expiry);
    });
    return Array.from(map.values());
  }

  function daysUntil(dateText) {
    const target = new Date(`${dateText}T00:00:00+08:00`);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
  }

  function renderSummary() {
    const { $, escapeHtml } = DI.utils;
    const { state } = DI;
    const { mockInventory } = DI.mock;
    let metrics = [];

    if (state.mode === "inventory") {
      const rules = inventoryRules();
      const items = aggregateByCode(mockInventory);
      metrics = [
        ["總品項數", items.length],
        ["低庫存數", items.filter((item) => item.quantity <= rules.lowStockQuantityLessThanOrEqual).length],
        ["即期品項數", items.filter((item) => item.expiries.some((expiry) => daysUntil(expiry) <= rules.expiringWithinDays)).length]
      ];
    }

    if (state.mode === "inbound") {
      metrics = [
        ["入庫明細數", state.inboundItems.length],
        ["總入庫數量", sum(state.inboundItems, "quantity")],
        ["入庫位置", state.inboundItems.at(-1)?.location || "-"],
        ["暫存 / 送出", state.inboundDraftStatus]
      ];
    }

    if (state.mode === "stocktake") {
      metrics = [
        ["盤點列數", state.stocktakeItems.length],
        ["有差異列數", state.stocktakeItems.filter((row) => row.diff !== 0).length],
        ["增加數量", state.stocktakeItems.filter((row) => row.diff > 0).reduce((total, row) => total + row.diff, 0)],
        ["減少數量", Math.abs(state.stocktakeItems.filter((row) => row.diff < 0).reduce((total, row) => total + row.diff, 0))]
      ];
    }

    if (state.mode === "issue") {
      metrics = [
        ["領用明細數", state.issueItems.length],
        ["總領用數量", sum(state.issueItems, "quantity")],
        ["自費項目數", state.issueItems.filter((row) => row.priceStatus === "自費").length],
        ["健保 / 不計價", `${state.issueItems.filter((row) => row.priceStatus === "健保").length} / ${state.issueItems.filter((row) => row.priceStatus === "不計價").length}`]
      ];
    }

    $("summaryArea").innerHTML = `<h2>摘要</h2><div class="summary-grid" style="margin-top: 12px;">${metrics.map(([label, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</div>`;
  }

  DI.modules.summary = { renderSummary, sum };
})();
