(() => {
  "use strict";

  const modes = [
    { id: "inventory", label: "庫存總覽" },
    { id: "inbound", label: "入庫" },
    { id: "stocktake", label: "盤點" },
    { id: "issue", label: "領用" }
  ];

  const locations = ["5A", "傷口中心", "開刀房"];
  const units = ["片", "包", "盒"];
  const priceStatuses = ["待確認", "健保", "自費", "不計價"];

  const mockDressings = [
    { code: "9590548", name: "SI-AID", spec: "20x30", category: "人工皮", barcodes: ["4900070187549"] },
    { code: "9590544", name: "Atrauman", spec: "10x20", category: "油性敷料", barcodes: ["4049500586436"] },
    { code: "9590563", name: "Aquacel Ag+", spec: "15x15", category: "銀離子敷料", barcodes: ["768455132034"] },
    { code: "9590506", name: "Biatain foam", spec: "17.5x17.5", category: "泡棉敷料", barcodes: ["5701780205092", "5708932709026"] },
    { code: "9590559", name: "Mepilex Ag", spec: "17.5x17.5", category: "銀離子泡棉", barcodes: ["7332430941381"] },
    { code: "9590533", name: "Allevyn", spec: "22.5x22.5", category: "泡棉敷料", barcodes: ["5000223416799"] },
    { code: "9590661", name: "Hydroclean cavity", spec: "4x8", category: "水活性敷料", barcodes: ["4052199256405", "4052199256412"] },
    { code: "9590662", name: "Hydroclean cavity", spec: "5x5", category: "水活性敷料", barcodes: ["4052199255484"] },
    { code: "9590664", name: "Hydroclean", spec: "8x14", category: "水活性敷料", barcodes: ["4052199285078"] },
    { code: "9590561", name: "Aquacel Ag+", spec: "20x30", category: "銀離子敷料", barcodes: ["768455132041"] },
    { code: "1EWF16", name: "Framycin 藥布", spec: "10x10", category: "藥布", barcodes: ["4713680390120"] },
    { code: "9200431", name: "Nylon 3-0", spec: "3-0", category: "縫線", barcodes: ["10884521079724"] }
  ];

  const mockInventory = [
    inventoryRow("9590548", "5A", "SA240501", "2027-02-28", 42, "片", "正常"),
    inventoryRow("9590544", "傷口中心", "AT240411", "2026-08-31", 7, "片", "低庫存"),
    inventoryRow("9590563", "開刀房", "AQ250101", "2026-07-20", 12, "片", "即期"),
    inventoryRow("9590506", "5A", "BI240908", "2027-10-15", 0, "包", "已用完"),
    inventoryRow("9590559", "傷口中心", "ME250305", "2028-03-31", 26, "片", "正常"),
    inventoryRow("9590533", "開刀房", "AL240912", "2027-09-01", 11, "片", "低庫存"),
    inventoryRow("9590661", "5A", "HC240721", "2026-07-05", 9, "包", "即期"),
    inventoryRow("9590662", "傷口中心", "HC240722", "2027-01-05", 18, "包", "正常"),
    inventoryRow("9590664", "開刀房", "HC240801", "2027-05-31", 15, "片", "正常"),
    inventoryRow("9590561", "5A", "AQ250201", "2028-04-30", 20, "片", "正常"),
    inventoryRow("1EWF16", "傷口中心", "FR240606", "2026-12-31", 5, "片", "低庫存"),
    inventoryRow("9200431", "開刀房", "NY240118", "2029-01-18", 31, "包", "正常")
  ];

  const mockStaff = ["王小明", "李雅婷", "陳志豪", "林護理師"];
  const mockDoctors = ["張醫師", "林醫師", "黃醫師", "陳醫師"];

  const state = {
    mode: "inventory",
    inventoryQuery: "",
    locationFilter: "全部",
    statusFilter: "全部",
    selectedInventoryId: mockInventory[0].id,
    inboundItems: [],
    stocktakeItems: [],
    issueItems: [],
    inboundDraftStatus: "尚未暫存",
    stocktakeStatus: "尚未儲存",
    issueDraftStatus: "尚未暫存",
    lastSuccess: "",
    lastError: "",
    logs: []
  };

  function inventoryRow(code, location, lot, expiry, quantity, unit, status) {
    const dressing = mockDressings.find((item) => item.code === code);
    return {
      id: `${code}-${location}-${lot}`,
      code,
      name: dressing.name,
      spec: dressing.spec,
      category: dressing.category,
      location,
      lot,
      expiry,
      quantity,
      unit,
      status,
      barcodes: dressing.barcodes
    };
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function optionList(values, selected) {
    return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`).join("");
  }

  function findDressing(input) {
    const query = String(input || "").trim().toLowerCase();
    return mockDressings.find((item) =>
      item.code.toLowerCase() === query ||
      item.name.toLowerCase().includes(query) ||
      item.barcodes.some((barcode) => barcode.toLowerCase() === query)
    ) || null;
  }

  function findBestInventory(input, location) {
    const dressing = findDressing(input);
    if (!dressing) return null;
    return mockInventory.find((row) => row.code === dressing.code && (!location || row.location === location)) ||
      mockInventory.find((row) => row.code === dressing.code) ||
      null;
  }

  function statusBadge(status) {
    const className = status === "正常" ? "ok" : status === "即期" ? "warn" : status === "已用完" ? "danger" : "neutral";
    return `<span class="badge ${className}">${escapeHtml(status)}</span>`;
  }

  function renderApp() {
    renderTabs();
    renderStatus();
    if (state.mode === "inventory") renderInventoryOverview();
    if (state.mode === "inbound") renderInbound();
    if (state.mode === "stocktake") renderStocktake();
    if (state.mode === "issue") renderIssue();
    renderSummary();
    renderDetail();
    renderLog();
  }

  function renderTabs() {
    $("modeTabs").innerHTML = modes.map((mode) => `
      <button class="tab-button" type="button" aria-selected="${state.mode === mode.id}" data-mode="${mode.id}">
        ${escapeHtml(mode.label)}
      </button>
    `).join("");
  }

  function renderStatus() {
    const active = modes.find((mode) => mode.id === state.mode);
    $("statusArea").innerHTML = `
      <h2>${escapeHtml(active.label)}工作區</h2>
      <p>目前為前端 AJAX shell。所有資料只存在瀏覽器記憶體，不會寫入資料庫。</p>
      <div class="badge-row" style="margin-top: 12px;">
        <span class="badge warn">Mock mode</span>
        <span class="badge neutral">No Apps Script</span>
        <span class="badge neutral">No API endpoint</span>
      </div>
    `;

    $("placeholderArea").innerHTML = `
      <div class="empty">空狀態 placeholder：沒有資料時將顯示補貨、盤點或領用提示。</div>
      <div class="error" style="margin-top: 10px;">錯誤狀態 placeholder：未來 API 失敗、權限不足或資料格式錯誤會顯示在這裡。</div>
      <div class="success" style="margin-top: 10px;">完成狀態 placeholder：mock 儲存與送出成功時會同步更新摘要與 action log。</div>
    `;
  }

  function switchMode(mode) {
    if (!modes.some((item) => item.id === mode)) return;
    state.mode = mode;
    appendLog(`切換模式：${modes.find((item) => item.id === mode).label}`, "info", false);
    renderApp();
  }

  function filteredInventory() {
    const query = state.inventoryQuery.trim().toLowerCase();
    return mockInventory.filter((row) => {
      const matchQuery = !query ||
        row.code.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query) ||
        row.barcodes.some((barcode) => barcode.toLowerCase().includes(query));
      const matchLocation = state.locationFilter === "全部" || row.location === state.locationFilter;
      const matchStatus = state.statusFilter === "全部" || row.status === state.statusFilter;
      return matchQuery && matchLocation && matchStatus;
    });
  }

  function renderInventoryOverview() {
    const rows = filteredInventory();
    $("workspaceArea").innerHTML = `
      <h2>庫存總覽</h2>
      <div class="toolbar">
        <label>搜尋院內碼 / 名稱 / 條碼
          <input id="inventorySearch" type="search" value="${escapeHtml(state.inventoryQuery)}" placeholder="例如 9590548 或 Aquacel">
        </label>
        <label>位置篩選
          <select id="inventoryLocationFilter">${optionList(["全部", ...locations], state.locationFilter)}</select>
        </label>
        <label>狀態篩選
          <select id="inventoryStatusFilter">${optionList(["全部", "正常", "低庫存", "即期", "已用完"], state.statusFilter)}</select>
        </label>
      </div>
      ${rows.length ? inventoryTables(rows) : `<div class="empty">找不到符合條件的 mock 庫存。</div>`}
    `;
  }

  function inventoryTables(rows) {
    return `
      <div class="table-wrap desktop-table">
        <table>
          <thead>
            <tr><th>院內碼</th><th>敷料名稱</th><th>規格</th><th>分類</th><th>位置</th><th>批號</th><th>效期</th><th>庫存</th><th>狀態</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr class="${row.id === state.selectedInventoryId ? "is-selected" : ""}" data-inventory-id="${escapeHtml(row.id)}">
                <td>${escapeHtml(row.code)}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.spec)}</td>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.location)}</td>
                <td>${escapeHtml(row.lot)}</td>
                <td>${escapeHtml(row.expiry)}</td>
                <td>${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}</td>
                <td>${statusBadge(row.status)}</td>
              </tr>
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
              <div><dt>位置</dt><dd>${escapeHtml(row.location)}</dd></div>
              <div><dt>批號</dt><dd>${escapeHtml(row.lot)}</dd></div>
              <div><dt>效期</dt><dd>${escapeHtml(row.expiry)}</dd></div>
              <div><dt>庫存</dt><dd>${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}</dd></div>
              <div><dt>狀態</dt><dd>${statusBadge(row.status)}</dd></div>
            </dl>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderInbound() {
    $("workspaceArea").innerHTML = `
      <h2>入庫</h2>
      <div class="field-grid">
        <label>掃描或輸入條碼 / 院內碼
          <input id="inboundCode" placeholder="例如 4900070187549">
        </label>
        <label>敷料名稱
          <input id="inboundName" readonly placeholder="mock 自動帶入">
        </label>
        <label>規格
          <input id="inboundSpec" readonly placeholder="mock 自動帶入">
        </label>
        <label>批號
          <input id="inboundLot" placeholder="批號">
        </label>
        <label>效期
          <input id="inboundExpiry" type="date">
        </label>
        <label>入庫位置
          <select id="inboundLocation">${optionList(locations, "5A")}</select>
        </label>
        <label>入庫數量
          <input id="inboundQty" type="number" min="1" value="1">
        </label>
        <label>單位
          <select id="inboundUnit">${optionList(units, "片")}</select>
        </label>
        <label class="span-3">備註
          <textarea id="inboundNote" placeholder="入庫備註"></textarea>
        </label>
      </div>
      <div class="action-row">
        <button class="primary" type="button" data-action="addInboundItem">新增入庫明細</button>
        <button class="secondary" type="button" data-action="saveInboundDraft">暫存入庫</button>
        <button class="primary" type="button" data-action="submitInbound">mock 送出入庫</button>
      </div>
      ${renderLineItems("inbound")}
    `;
  }

  function renderStocktake() {
    $("workspaceArea").innerHTML = `
      <h2>盤點</h2>
      <div class="field-grid">
        <label>盤點位置
          <select id="stocktakeLocation">${optionList(locations, "5A")}</select>
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
      ${renderLineItems("stocktake")}
    `;
  }

  function renderIssue() {
    $("workspaceArea").innerHTML = `
      <h2>領用</h2>
      <div class="field-grid">
        <label>領用人
          <select id="issueStaff">${optionList(mockStaff, mockStaff[0])}</select>
        </label>
        <label>領用單位
          <select id="issueLocation">${optionList(locations, "5A")}</select>
        </label>
        <label>病歷號
          <input id="issueChartNo" placeholder="病歷號">
        </label>
        <label>主治醫師
          <select id="issueDoctor">${optionList(mockDoctors, mockDoctors[0])}</select>
        </label>
        <label>HIS 計價狀態
          <select id="issuePriceStatus">${optionList(priceStatuses, "待確認")}</select>
        </label>
        <label>掃描或輸入條碼 / 院內碼
          <input id="issueCode" placeholder="條碼或院內碼">
        </label>
        <label>批號 / 效期 mock
          <input id="issueLotExpiry" readonly placeholder="mock 自動帶入">
        </label>
        <label>領用數量
          <input id="issueQty" type="number" min="1" value="1">
        </label>
        <label class="span-3">備註
          <textarea id="issueNote" placeholder="領用備註"></textarea>
        </label>
      </div>
      <div class="action-row">
        <button class="primary" type="button" data-action="addIssueItem">新增領用明細</button>
        <button class="secondary" type="button" data-action="saveIssueDraft">mock 儲存草稿</button>
        <button class="primary" type="button" data-action="submitIssue">mock 送出領用</button>
      </div>
      ${renderLineItems("issue")}
    `;
  }

  function renderLineItems(type) {
    const rows = type === "inbound" ? state.inboundItems : type === "stocktake" ? state.stocktakeItems : state.issueItems;
    if (!rows.length) return `<div class="empty" style="margin-top: 14px;">目前沒有${type === "inbound" ? "入庫明細" : type === "stocktake" ? "盤點列" : "領用明細"}。</div>`;
    const headers = type === "stocktake"
      ? ["院內碼", "敷料名稱", "位置", "批號", "系統", "實際", "差異", "原因", "操作"]
      : type === "issue"
        ? ["院內碼", "敷料名稱", "規格", "批號", "效期", "數量", "HIS", "病歷號", "主治", "操作"]
        : ["院內碼", "敷料名稱", "規格", "批號", "效期", "位置", "數量", "單位", "操作"];

    return `
      <div class="table-wrap" style="margin-top: 14px;">
        <table>
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => renderLineItemRow(type, row)).join("")}</tbody>
        </table>
      </div>
    `;
  }

  function renderLineItemRow(type, row) {
    if (type === "stocktake") {
      return `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)} ${escapeHtml(row.spec)}</td><td>${escapeHtml(row.location)}</td><td>${escapeHtml(row.lot)}</td><td>${row.systemQty}</td><td>${row.actualQty}</td><td>${row.diff}</td><td>${escapeHtml(row.reason)}</td><td><button class="danger-button" type="button" data-remove-stocktake="${row.id}">移除</button></td></tr>`;
    }
    if (type === "issue") {
      return `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.spec)}</td><td>${escapeHtml(row.lot)}</td><td>${escapeHtml(row.expiry)}</td><td>${row.quantity}</td><td>${escapeHtml(row.priceStatus)}</td><td>${escapeHtml(row.chartNo)}</td><td>${escapeHtml(row.doctor)}</td><td><button class="danger-button" type="button" data-remove-issue="${row.id}">移除</button></td></tr>`;
    }
    return `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.spec)}</td><td>${escapeHtml(row.lot)}</td><td>${escapeHtml(row.expiry)}</td><td>${escapeHtml(row.location)}</td><td>${row.quantity}</td><td>${escapeHtml(row.unit)}</td><td><button class="danger-button" type="button" data-remove-inbound="${row.id}">移除</button></td></tr>`;
  }

  function renderSummary() {
    let metrics = [];
    if (state.mode === "inventory") {
      metrics = [
        ["總品項數", mockInventory.length],
        ["低庫存數", mockInventory.filter((row) => row.status === "低庫存").length],
        ["即期品項數", mockInventory.filter((row) => row.status === "即期").length],
        ["已用完批號數", mockInventory.filter((row) => row.status === "已用完").length]
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

  function renderDetail() {
    const row = mockInventory.find((item) => item.id === state.selectedInventoryId) || mockInventory[0];
    const success = state.lastSuccess ? `<div class="success" style="margin-top: 12px;">${escapeHtml(state.lastSuccess)}</div>` : "";
    const error = state.lastError ? `<div class="error" style="margin-top: 12px;">${escapeHtml(state.lastError)}</div>` : "";
    $("detailArea").innerHTML = `
      <h2>詳細資料</h2>
      <div class="detail-list">
        <div class="detail-line"><span>院內碼</span><strong>${escapeHtml(row.code)}</strong></div>
        <div class="detail-line"><span>敷料</span><strong>${escapeHtml(row.name)} ${escapeHtml(row.spec)}</strong></div>
        <div class="detail-line"><span>位置</span><strong>${escapeHtml(row.location)}</strong></div>
        <div class="detail-line"><span>批號</span><strong>${escapeHtml(row.lot)}</strong></div>
        <div class="detail-line"><span>效期</span><strong>${escapeHtml(row.expiry)}</strong></div>
        <div class="detail-line"><span>條碼</span><strong>${escapeHtml(row.barcodes.join(", "))}</strong></div>
      </div>
      ${success}${error}
    `;
  }

  function renderLog() {
    $("logArea").innerHTML = `
      <h2>操作紀錄 / 診斷</h2>
      <div class="log-list">
        ${state.logs.map((log) => `<div class="log-item ${escapeHtml(log.level)}"><strong>${escapeHtml(log.time)}</strong> ${escapeHtml(log.message)}</div>`).join("") || `<div class="empty">尚無操作紀錄。</div>`}
      </div>
    `;
  }

  function sum(rows, key) {
    return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  }

  function rowId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function addInboundItem() {
    const dressing = findDressing($("inboundCode").value);
    if (!dressing) return setError("找不到對應的 mock 敷料，請輸入院內碼或條碼。");
    const item = {
      id: rowId("inbound"),
      code: dressing.code,
      name: dressing.name,
      spec: dressing.spec,
      lot: $("inboundLot").value || "MOCK-LOT",
      expiry: $("inboundExpiry").value || "2027-12-31",
      location: $("inboundLocation").value,
      quantity: Number($("inboundQty").value || 0),
      unit: $("inboundUnit").value,
      note: $("inboundNote").value
    };
    state.inboundItems.push(item);
    state.inboundDraftStatus = "已新增明細";
    setSuccess(`已新增入庫：${item.name} ${item.spec} ${item.quantity}${item.unit}`, false);
    appendLog(`新增入庫明細：${item.code} ${item.name} ${item.quantity}${item.unit}`, "success");
  }

  function removeInboundItem(rowIdValue) {
    state.inboundItems = state.inboundItems.filter((row) => row.id !== rowIdValue);
    appendLog("移除入庫明細", "warn");
    renderApp();
  }

  function saveInboundDraft() {
    state.inboundDraftStatus = "mock 暫存成功";
    setSuccess(`已暫存 ${state.inboundItems.length} 筆入庫明細`, false);
    appendLog("mock save success：入庫暫存", "success");
  }

  function submitInbound() {
    state.inboundDraftStatus = "mock 送出成功";
    setSuccess(`已 mock 送出入庫，總數量 ${sum(state.inboundItems, "quantity")}`, false);
    appendLog("mock submit success：入庫送出", "success");
  }

  function addStocktakeItem() {
    const location = $("stocktakeLocation").value;
    const input = $("stocktakeCode").value;
    const inventory = findBestInventory(input, location) || mockInventory.find((row) => row.lot.toLowerCase() === input.trim().toLowerCase());
    if (!inventory) return setError("找不到對應的 mock 庫存，請輸入院內碼、條碼或批號。");
    const actualQty = Number($("stocktakeActualQty").value || 0);
    const item = {
      id: rowId("stocktake"),
      code: inventory.code,
      name: inventory.name,
      spec: inventory.spec,
      location,
      lot: inventory.lot,
      systemQty: inventory.quantity,
      actualQty,
      diff: actualQty - inventory.quantity,
      reason: $("stocktakeReason").value,
      note: $("stocktakeNote").value
    };
    state.stocktakeItems.push(item);
    state.stocktakeStatus = "已新增盤點列";
    setSuccess(`已新增盤點：${item.name} 差異 ${item.diff}`, false);
    appendLog(`新增盤點列：${item.code} ${item.name} 差異 ${item.diff}`, item.diff === 0 ? "success" : "warn");
  }

  function removeStocktakeItem(rowIdValue) {
    state.stocktakeItems = state.stocktakeItems.filter((row) => row.id !== rowIdValue);
    appendLog("移除盤點列", "warn");
    renderApp();
  }

  function saveStocktake() {
    state.stocktakeStatus = "mock 儲存成功";
    setSuccess(`已 mock 儲存 ${state.stocktakeItems.length} 筆盤點列`, false);
    appendLog("mock save success：盤點儲存", "success");
  }

  function completeStocktake() {
    state.stocktakeStatus = "mock 完成盤點";
    setSuccess(`已 mock 完成盤點，有差異 ${state.stocktakeItems.filter((row) => row.diff !== 0).length} 筆`, false);
    appendLog("mock submit success：完成盤點", "success");
  }

  function addIssueItem() {
    const location = $("issueLocation").value;
    const inventory = findBestInventory($("issueCode").value, location);
    if (!inventory) return setError("找不到對應的 mock 庫存，請輸入院內碼或條碼。");
    const item = {
      id: rowId("issue"),
      code: inventory.code,
      name: inventory.name,
      spec: inventory.spec,
      lot: inventory.lot,
      expiry: inventory.expiry,
      quantity: Number($("issueQty").value || 0),
      priceStatus: $("issuePriceStatus").value,
      chartNo: $("issueChartNo").value || "未填",
      doctor: $("issueDoctor").value,
      staff: $("issueStaff").value,
      location,
      note: $("issueNote").value
    };
    state.issueItems.push(item);
    state.issueDraftStatus = "已新增明細";
    $("issueLotExpiry").value = `${item.lot} / ${item.expiry}`;
    setSuccess(`${item.staff} 從 ${item.location} 領用 ${item.name} ${item.spec} ${item.quantity} 給 ${item.chartNo}，主治 ${item.doctor}，${item.priceStatus}。`, false);
    appendLog(`新增領用明細：${item.code} ${item.name} ${item.quantity} ${item.priceStatus}`, "success");
  }

  function removeIssueItem(rowIdValue) {
    state.issueItems = state.issueItems.filter((row) => row.id !== rowIdValue);
    appendLog("移除領用明細", "warn");
    renderApp();
  }

  function saveIssueDraft() {
    state.issueDraftStatus = "mock 草稿成功";
    setSuccess(`已 mock 儲存 ${state.issueItems.length} 筆領用草稿`, false);
    appendLog("mock save success：領用草稿", "success");
  }

  function submitIssue() {
    state.issueDraftStatus = "mock 送出成功";
    const summaries = state.issueItems.map((item) => `${item.staff} 從 ${item.location} 領用 ${item.name} ${item.spec} ${item.quantity} 給 ${item.chartNo}，主治 ${item.doctor}，${item.priceStatus}。`);
    setSuccess(summaries.at(-1) || "尚無領用明細可送出", false);
    appendLog("mock submit success：領用送出", "success");
  }

  function setSuccess(message, shouldRender = true) {
    state.lastSuccess = message;
    state.lastError = "";
    if (shouldRender) renderApp();
  }

  function setError(message) {
    state.lastError = message;
    state.lastSuccess = "";
    appendLog(message, "error", false);
    renderApp();
  }

  function appendLog(message, level = "info", shouldRender = true) {
    state.logs.unshift({
      message,
      level,
      time: new Date().toLocaleTimeString("zh-TW", { hour12: false })
    });
    state.logs = state.logs.slice(0, 40);
    if (shouldRender) renderApp();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const modeButton = event.target.closest("[data-mode]");
      if (modeButton) switchMode(modeButton.dataset.mode);

      const actionButton = event.target.closest("[data-action]");
      if (actionButton && window[actionButton.dataset.action]) window[actionButton.dataset.action]();

      const inventoryRowButton = event.target.closest("[data-inventory-id]");
      if (inventoryRowButton) {
        state.selectedInventoryId = inventoryRowButton.dataset.inventoryId;
        appendLog(`查看庫存詳細資料：${state.selectedInventoryId}`, "info");
      }

      const inboundRemove = event.target.closest("[data-remove-inbound]");
      if (inboundRemove) removeInboundItem(inboundRemove.dataset.removeInbound);

      const stocktakeRemove = event.target.closest("[data-remove-stocktake]");
      if (stocktakeRemove) removeStocktakeItem(stocktakeRemove.dataset.removeStocktake);

      const issueRemove = event.target.closest("[data-remove-issue]");
      if (issueRemove) removeIssueItem(issueRemove.dataset.removeIssue);
    });

    document.addEventListener("input", (event) => {
      if (event.target.id === "inventorySearch") {
        state.inventoryQuery = event.target.value;
        appendLog(`搜尋庫存：${state.inventoryQuery || "清除搜尋"}`, "info", false);
        renderApp();
      }
      if (event.target.id === "inboundCode") fillDressingFields(event.target.value, "inbound");
      if (event.target.id === "stocktakeCode" || event.target.id === "stocktakeActualQty") fillStocktakeFields();
      if (event.target.id === "issueCode") fillIssueFields(event.target.value);
    });

    document.addEventListener("change", (event) => {
      if (event.target.id === "inventoryLocationFilter") {
        state.locationFilter = event.target.value;
        appendLog(`修改位置篩選：${state.locationFilter}`, "info");
      }
      if (event.target.id === "inventoryStatusFilter") {
        state.statusFilter = event.target.value;
        appendLog(`修改狀態篩選：${state.statusFilter}`, "info");
      }
      if (event.target.id === "stocktakeLocation") fillStocktakeFields();
      if (event.target.id === "issuePriceStatus") appendLog(`修改 HIS 計價狀態：${event.target.value}`, "info");
    });
  }

  function fillDressingFields(input, prefix) {
    const dressing = findDressing(input);
    $(`${prefix}Name`).value = dressing?.name || "";
    $(`${prefix}Spec`).value = dressing?.spec || "";
  }

  function fillStocktakeFields() {
    const inventory = findBestInventory($("stocktakeCode")?.value, $("stocktakeLocation")?.value);
    if (!inventory) return;
    $("stocktakeSystemQty").value = inventory.quantity;
    $("stocktakeDiff").value = Number($("stocktakeActualQty").value || 0) - inventory.quantity;
  }

  function fillIssueFields(input) {
    const inventory = findBestInventory(input, $("issueLocation")?.value);
    $("issueLotExpiry").value = inventory ? `${inventory.lot} / ${inventory.expiry}` : "";
  }

  function readyLoadingGate() {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done("dressing-inventory");
      return;
    }
    document.documentElement.classList.remove("skhps-css-loading");
  }

  Object.assign(window, {
    mockDressings,
    mockInventory,
    mockStaff,
    mockDoctors,
    renderApp,
    switchMode,
    renderInventoryOverview,
    renderInbound,
    renderStocktake,
    renderIssue,
    renderSummary,
    addInboundItem,
    removeInboundItem,
    saveInboundDraft,
    submitInbound,
    addStocktakeItem,
    removeStocktakeItem,
    saveStocktake,
    completeStocktake,
    addIssueItem,
    removeIssueItem,
    saveIssueDraft,
    submitIssue,
    appendLog
  });

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    appendLog("dressing-inventory mock runtime initialized", "success", false);
    renderApp();
    readyLoadingGate();
  });
})();
