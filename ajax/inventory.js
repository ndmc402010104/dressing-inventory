(function () {
  "use strict";

  const DI = window.DressingInventory;

  function statusBadge(status) {
    const { escapeHtml } = DI.utils;
    const className = status === "正常" ? "ok" : status === "即期" ? "warn" : status === "已用完" ? "danger" : "neutral";
    return `<span class="badge ${className}">${escapeHtml(status)}</span>`;
  }

  function inventoryRules() {
    const rules = window.SKHPS_APP_CONFIG && window.SKHPS_APP_CONFIG.inventoryRules;
    return Object.assign({
      lowStockQuantityLessThanOrEqual: 10,
      expiringWithinDays: 90
    }, rules || {});
  }

  function daysUntil(dateText) {
    const target = new Date(`${dateText}T00:00:00+08:00`);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
  }

  function hasExpiringBatch(rows) {
    return rows.some((row) => daysUntil(row.expiry) <= inventoryRules().expiringWithinDays);
  }

  function isLowStock(totalQuantity) {
    return totalQuantity <= inventoryRules().lowStockQuantityLessThanOrEqual;
  }

  function aggregateStatus(rows, totalQuantity) {
    if (totalQuantity <= 0) return "已用完";
    if (hasExpiringBatch(rows)) return "即期";
    if (isLowStock(totalQuantity)) return "低庫存";
    return "正常";
  }

  function matchesStatusFilter(row, status) {
    if (status === "全部") return true;
    if (status === "已用完") return row.quantity <= 0;
    if (status === "即期") return hasExpiringBatch(row.batches);
    if (status === "低庫存") return isLowStock(row.quantity);
    return row.status === status;
  }

  function aggregateInventoryRows(rows) {
    const map = new Map();

    rows.forEach((row) => {
      if (!map.has(row.code)) {
        map.set(row.code, {
          id: row.code,
          code: row.code,
          name: row.name,
          spec: row.spec,
          category: row.category,
          barcodes: row.barcodes,
          batches: [],
          locations: [],
          quantity: 0,
          unit: row.unit,
          status: "正常",
          earliestExpiry: row.expiry
        });
      }

      const item = map.get(row.code);
      item.batches.push(row);
      item.quantity += Number(row.quantity || 0);
      item.earliestExpiry = row.expiry < item.earliestExpiry ? row.expiry : item.earliestExpiry;

      if (!item.locations.includes(row.location)) {
        item.locations.push(row.location);
      }
    });

    return Array.from(map.values()).map((item) => {
      item.status = aggregateStatus(item.batches, item.quantity);
      item.locationSummary = item.locations.join(" / ");
      item.batchCount = item.batches.length;
      return item;
    });
  }

  function filteredInventory() {
    const { state } = DI;
    const query = state.inventoryQuery.trim().toLowerCase();
    const rows = DI.mock.mockInventory.filter((row) => {
      const matchQuery = !query ||
        row.code.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query) ||
        row.spec.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query) ||
        row.barcodes.some((barcode) => barcode.toLowerCase().includes(query));
      return matchQuery && (state.locationFilter === "全部" || row.location === state.locationFilter);
    });

    const aggregated = aggregateInventoryRows(rows);
    const filtered = aggregated.filter((row) => matchesStatusFilter(row, state.statusFilter));

    return sortInventoryRows(filtered);
  }

  function sortInventoryRows(rows) {
    const { inventorySortKey, inventorySortDirection } = DI.state;
    const direction = inventorySortDirection === "desc" ? -1 : 1;

    return rows.slice().sort((a, b) => {
      const aValue = String(a[inventorySortKey] ?? "").toLowerCase();
      const bValue = String(b[inventorySortKey] ?? "").toLowerCase();
      return aValue.localeCompare(bValue, "zh-Hant", { numeric: true }) * direction;
    });
  }

  function sortInventoryBy(key) {
    if (DI.state.inventorySortKey === key) {
      DI.state.inventorySortDirection = DI.state.inventorySortDirection === "asc" ? "desc" : "asc";
    } else {
      DI.state.inventorySortKey = key;
      DI.state.inventorySortDirection = "asc";
    }

    DI.modules.log.appendLog(`庫存總覽排序：${sortLabel(key)} ${DI.state.inventorySortDirection === "asc" ? "升冪" : "降冪"}`, "info", false);
    DI.renderApp();
  }

  function sortLabel(key) {
    return {
      code: "院內碼",
      name: "敷料名稱",
      spec: "規格",
      category: "分類"
    }[key] || key;
  }

  function sortHeader(key, label) {
    const { escapeHtml } = DI.utils;
    const active = DI.state.inventorySortKey === key;
    const mark = active ? (DI.state.inventorySortDirection === "asc" ? " ▲" : " ▼") : "";
    return `<button class="sort-button" type="button" data-inventory-sort="${escapeHtml(key)}">${escapeHtml(label)}${mark}</button>`;
  }

  function renderInventoryOverview() {
    const { $, escapeHtml, optionList } = DI.utils;
    const rows = filteredInventory();
    $("workspaceArea").innerHTML = `
      <h2>庫存總覽</h2>
      <div class="toolbar">
        <label>搜尋院內碼 / 名稱 / 條碼
          <input id="inventorySearch" type="search" value="${escapeHtml(DI.state.inventoryQuery)}" placeholder="例如 9590548 或 Aquacel">
        </label>
        <label>位置篩選
          <select id="inventoryLocationFilter">${optionList(["全部", ...DI.mock.locations], DI.state.locationFilter)}</select>
        </label>
        <label>狀態篩選
          <select id="inventoryStatusFilter">${optionList(["全部", "正常", "低庫存", "即期", "已用完"], DI.state.statusFilter)}</select>
        </label>
      </div>
      ${rows.length ? inventoryTables(rows) : `<div class="empty">找不到符合條件的 mock 庫存。</div>`}
    `;
  }

  function inventoryTables(rows) {
    const { escapeHtml } = DI.utils;
    return `
      <div class="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>${sortHeader("code", "院內碼")}</th>
              <th>${sortHeader("name", "敷料名稱")}</th>
              <th>${sortHeader("spec", "規格")}</th>
              <th>${sortHeader("category", "分類")}</th>
              <th>位置</th><th>批號數</th><th>最早效期</th><th>總庫存</th><th>狀態</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr class="${row.id === DI.state.selectedInventoryId ? "is-selected" : ""}" data-inventory-id="${escapeHtml(row.id)}">
                <td>${escapeHtml(row.code)}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.spec)}</td>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.locationSummary)}</td>
                <td>${escapeHtml(row.batchCount)}</td>
                <td>${escapeHtml(row.earliestExpiry)}</td>
                <td>${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}</td>
                <td>${statusBadge(row.status)}</td>
              </tr>
              ${row.id === DI.state.selectedInventoryId ? `
                <tr class="inventory-detail-row">
                  <td colspan="9">${renderInlineDetail(row)}</td>
                </tr>
              ` : ""}
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="mobile-card-list">
        ${rows.map((row) => `
          <article class="item-card" data-inventory-id="${escapeHtml(row.id)}">
            <h3>${escapeHtml(row.name)} ${escapeHtml(row.spec)}</h3>
            <dl>
              <div><dt>院內碼</dt><dd>${escapeHtml(row.code)}</dd></div>
              <div><dt>分類</dt><dd>${escapeHtml(row.category)}</dd></div>
              <div><dt>位置</dt><dd>${escapeHtml(row.locationSummary)}</dd></div>
              <div><dt>批號數</dt><dd>${escapeHtml(row.batchCount)}</dd></div>
              <div><dt>最早效期</dt><dd>${escapeHtml(row.earliestExpiry)}</dd></div>
              <div><dt>總庫存</dt><dd>${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}</dd></div>
              <div><dt>狀態</dt><dd>${statusBadge(row.status)}</dd></div>
            </dl>
          </article>
          ${row.id === DI.state.selectedInventoryId ? renderInlineDetail(row) : ""}
        `).join("")}
      </div>
    `;
  }

  function renderInlineDetail(row) {
    const { escapeHtml } = DI.utils;
    const success = DI.state.lastSuccess ? `<div class="success" style="margin-top: 12px;">${escapeHtml(DI.state.lastSuccess)}</div>` : "";
    const error = DI.state.lastError ? `<div class="error" style="margin-top: 12px;">${escapeHtml(DI.state.lastError)}</div>` : "";
    return `
      <section class="inventory-detail-panel">
        <div class="inventory-detail-head">
          <div>
            <h3>詳細資料</h3>
            <p>${escapeHtml(row.name)} ${escapeHtml(row.spec)}</p>
          </div>
          ${statusBadge(row.status)}
        </div>
      <div class="detail-list">
        <div class="detail-line"><span>院內碼</span><strong>${escapeHtml(row.code)}</strong></div>
        <div class="detail-line"><span>分類</span><strong>${escapeHtml(row.category)}</strong></div>
        <div class="detail-line"><span>位置</span><strong>${escapeHtml(row.locationSummary)}</strong></div>
        <div class="detail-line"><span>總庫存</span><strong>${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}</strong></div>
        <div class="detail-line"><span>批號數</span><strong>${escapeHtml(row.batchCount)}</strong></div>
        <div class="detail-line"><span>條碼</span><strong>${escapeHtml(row.barcodes.join(", "))}</strong></div>
      </div>
      <h3 style="margin-top: 14px;">批號明細</h3>
      <div class="batch-list">
        ${row.batches.map((batch) => `
          <article class="batch-row">
            <div>
              <div class="batch-main">${escapeHtml(batch.location)}</div>
              <div class="batch-sub">位置</div>
            </div>
            <div>
              <div class="batch-main">${escapeHtml(batch.lot)}</div>
              <div class="batch-sub">效期 ${escapeHtml(batch.expiry)}</div>
            </div>
            <div class="batch-meta">
              <strong>${escapeHtml(batch.quantity)} ${escapeHtml(batch.unit)}</strong>
              ${statusBadge(batch.status)}
            </div>
          </article>
        `).join("")}
      </div>
      <button class="inline-log-toggle" type="button" data-inventory-log-toggle>
        ${DI.state.inventoryLogOpen ? "隱藏操作紀錄" : "顯示操作紀錄"}
      </button>
      ${DI.state.inventoryLogOpen ? `
        <div class="inline-log-panel">
          <h3>操作紀錄</h3>
          <div class="log-list">${DI.modules.log.renderLogItems()}</div>
        </div>
      ` : ""}
      ${success}${error}
      </section>
    `;
  }

  function inventoryElementsById(id) {
    return Array.from(document.querySelectorAll("[data-inventory-id]"))
      .filter((element) => element.dataset.inventoryId === id);
  }

  function clearScrollSpacers() {
    document.querySelectorAll(".inventory-scroll-spacer").forEach((element) => element.remove());
  }

  function scheduleScrollSpacerCleanup() {
    let lastTouchY = 0;
    let lastWheelTime = performance.now();
    let lastTouchTime = performance.now();

    const hasSpacer = () => Boolean(document.querySelector(".inventory-scroll-spacer"));

    const shrinkBy = (amount) => {
      if (amount <= 0) return false;
      const spacers = Array.from(document.querySelectorAll(".inventory-scroll-spacer"));
      if (!spacers.length) return false;

      let remainingHeight = 0;
      spacers.forEach((spacer) => {
        const currentHeight = spacer.getBoundingClientRect().height;
        const nextHeight = Math.max(0, currentHeight - amount);
        spacer.style.height = `${nextHeight}px`;
        spacer.style.minHeight = `${nextHeight}px`;
        remainingHeight += nextHeight;
      });

      if (remainingHeight <= 0) {
        clearScrollSpacers();
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("keydown", handleKeydown);
        return false;
      }

      return true;
    };

    const speedRatio = (distance, elapsed) => {
      const speed = distance / Math.max(elapsed, 16);
      return Math.min(3, Math.max(1, 1 + speed * 0.8));
    };

    const handleWheel = (event) => {
      if (event.deltaY >= 0 || !hasSpacer()) return;
      const now = performance.now();
      const distance = Math.abs(event.deltaY);
      shrinkBy(distance * speedRatio(distance, now - lastWheelTime));
      lastWheelTime = now;
    };

    const handleKeydown = (event) => {
      if (!hasSpacer()) return;
      if (event.key === "ArrowUp") shrinkBy(48);
      if (event.key === "PageUp") shrinkBy(Math.round(window.innerHeight * 0.8));
      if (event.key === "Home") shrinkBy(Number.MAX_SAFE_INTEGER);
    };

    const handleTouchStart = (event) => {
      lastTouchY = event.touches && event.touches[0] ? event.touches[0].clientY : 0;
      lastTouchTime = performance.now();
    };

    const handleTouchMove = (event) => {
      const currentY = event.touches && event.touches[0] ? event.touches[0].clientY : lastTouchY;
      const upwardAmount = currentY - lastTouchY;
      if (upwardAmount > 0 && hasSpacer()) {
        const now = performance.now();
        shrinkBy(upwardAmount * speedRatio(upwardAmount, now - lastTouchTime));
        lastTouchTime = now;
      }
      lastTouchY = currentY;
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeydown);
  }

  function preserveSelectedDetailSpace() {
    clearScrollSpacers();

    const desktopDetail = document.querySelector(".inventory-detail-row");
    const mobileDetail = document.querySelector(".mobile-card-list > .inventory-detail-panel");
    const detail = desktopDetail || mobileDetail;
    if (!detail) return;

    const height = Math.ceil(detail.getBoundingClientRect().height);
    const root = document.getElementById("dressingInventoryApp") || document.body;
    root.insertAdjacentHTML("beforeend", `<div class="inventory-scroll-spacer" aria-hidden="true" style="height: ${height}px; min-height: ${height}px; overflow: hidden; pointer-events: none;"></div>`);

    scheduleScrollSpacerCleanup();
  }

  function clearInlineDetails() {
    document.querySelectorAll(".inventory-detail-row").forEach((element) => element.remove());
    document.querySelectorAll(".mobile-card-list > .inventory-detail-panel").forEach((element) => element.remove());
    document.querySelectorAll("[data-inventory-id].is-selected").forEach((element) => {
      element.classList.remove("is-selected");
    });
  }

  function renderSelectedInlineDetail(options = {}) {
    if (!options.keepScrollSpacers) {
      clearScrollSpacers();
    }

    clearInlineDetails();

    if (!DI.state.selectedInventoryId) return;

    const row = filteredInventory().find((item) => item.id === DI.state.selectedInventoryId);
    if (!row) {
      DI.state.selectedInventoryId = "";
      return;
    }

    inventoryElementsById(row.id).forEach((element) => {
      element.classList.add("is-selected");

      if (element.tagName.toLowerCase() === "tr") {
        element.insertAdjacentHTML("afterend", `
          <tr class="inventory-detail-row">
            <td colspan="9">${renderInlineDetail(row)}</td>
          </tr>
        `);
        return;
      }

      element.insertAdjacentHTML("afterend", renderInlineDetail(row));
    });
  }

  DI.modules.inventory = {
    renderInventoryOverview,
    filteredInventory,
    statusBadge,
    sortInventoryBy,
    renderSelectedInlineDetail,
    preserveSelectedDetailSpace,
    clearScrollSpacers
  };
})();
