(() => {
  "use strict";

  if (window.DRESSING_INVENTORY_APP_SCRIPT_LOADED) return;
  window.DRESSING_INVENTORY_APP_SCRIPT_LOADED = true;

  const config = window.DressingInventoryConfig || {
    appId: "dressing-inventory",
    appName: "敷料庫存盤點領用系統",
    mode: "mock",
    loadingTask: "dressing-inventory",
    ajaxBasePath: "assets/ajax/",
    ajaxModules: [
      "mock-data.js",
      "log.js",
      "summary.js",
      "inventory.js",
      "inbound.js",
      "stocktake.js",
      "issue.js"
    ]
  };

  const DI = window.DressingInventory = window.DressingInventory || {
    config,
    state: null,
    utils: {},
    modules: {},
    mock: {}
  };

  let eventsBound = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`AJAX module load failed: ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadAjaxModules() {
    if (!config || !Array.isArray(config.ajaxModules)) {
      return Promise.reject(new Error("DressingInventoryConfig.ajaxModules missing"));
    }

    let chain = Promise.resolve();
    config.ajaxModules.forEach((moduleName) => {
      chain = chain.then(() => loadScript(config.ajaxBasePath + moduleName));
    });
    return chain;
  }

  function initState() {
    DI.state = {
      mode: "inventory",
      inventoryQuery: "",
      locationFilter: "全部",
      statusFilter: "全部",
      inventorySortKey: "code",
      inventorySortDirection: "asc",
      selectedInventoryId: "",
      inventoryLogOpen: false,
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
  }

  function initUtils() {
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

    function rowId(prefix) {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function findDressing(input) {
      const query = String(input || "").trim().toLowerCase();
      const { mockDressings } = DI.mock || {};
      return (mockDressings || []).find((item) =>
        item.code.toLowerCase() === query ||
        item.name.toLowerCase().includes(query) ||
        item.barcodes.some((barcode) => barcode.toLowerCase() === query)
      ) || null;
    }

    function findBestInventory(input, location) {
      const dressing = findDressing(input);
      const { mockInventory } = DI.mock || {};
      if (!dressing) return null;
      return mockInventory.find((row) => row.code === dressing.code && (!location || row.location === location)) ||
        mockInventory.find((row) => row.code === dressing.code) ||
        null;
    }

    DI.utils = { $, escapeHtml, optionList, rowId, findDressing, findBestInventory };
  }

  function renderTabs() {
    const { $, escapeHtml } = DI.utils;
    const { modes } = DI.mock;
    const { state } = DI;
    $("modeTabs").innerHTML = modes.map((mode) => `
      <button class="tab-button" type="button" aria-selected="${state.mode === mode.id}" data-mode="${mode.id}">
        ${escapeHtml(mode.label)}
      </button>
    `).join("");
  }

  function renderApp() {
    const { state, modules } = DI;
    renderTabs();

    if (state.mode === "inventory") modules.inventory.renderInventoryOverview();
    if (state.mode === "inbound") modules.inbound.renderInbound();
    if (state.mode === "stocktake") modules.stocktake.renderStocktake();
    if (state.mode === "issue") modules.issue.renderIssue();

    modules.summary.renderSummary();
  }

  function switchMode(mode) {
    if (!DI.mock.modes.some((item) => item.id === mode)) return;
    DI.state.mode = mode;
    DI.modules.log.appendLog(`切換模式：${DI.mock.modes.find((item) => item.id === mode).label}`, "info", false);
    renderApp();
  }

  function restoreInputFocus(id, selectionStart, selectionEnd) {
    window.requestAnimationFrame(() => {
      const nextInput = DI.utils.$(id);
      if (!nextInput) return;
      nextInput.focus();
      if (typeof nextInput.setSelectionRange === "function") {
        nextInput.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }

  function captureElementPointerPosition(findElement, clientY, elementOffsetY) {
    const anchorRoots = [document.documentElement, document.body].filter(Boolean);
    const previousOverflowAnchors = anchorRoots.map((root) => root.style.overflowAnchor);

    anchorRoots.forEach((root) => {
      root.style.overflowAnchor = "none";
    });

    return function restorePointerPosition() {
      function adjustPosition() {
        const element = typeof findElement === "function" ? findElement() : document.querySelector(findElement);
        if (!element) return;
        const afterPointY = element.getBoundingClientRect().top + elementOffsetY;
        window.scrollTo({
          top: window.scrollY + afterPointY - clientY,
          left: window.scrollX,
          behavior: "auto"
        });
      }

      function restoreOverflowAnchor() {
        anchorRoots.forEach((root, index) => {
          root.style.overflowAnchor = previousOverflowAnchors[index];
        });
      }

      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        adjustPosition();
        window.setTimeout(() => {
          adjustPosition();
          restoreOverflowAnchor();
        }, 180);
      }));
    };
  }

  function findElementPointerOffset(element, clientY) {
    return clientY - element.getBoundingClientRect().top;
  }

  function findInventoryRowElement(id) {
    return Array.from(document.querySelectorAll("[data-inventory-id]"))
      .find((element) => element.dataset.inventoryId === id) || null;
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    const actionMap = {
      addInboundItem: DI.modules.inbound.addInboundItem,
      saveInboundDraft: DI.modules.inbound.saveInboundDraft,
      submitInbound: DI.modules.inbound.submitInbound,
      addStocktakeItem: DI.modules.stocktake.addStocktakeItem,
      saveStocktake: DI.modules.stocktake.saveStocktake,
      completeStocktake: DI.modules.stocktake.completeStocktake,
      addIssueItem: DI.modules.issue.addIssueItem,
      saveIssueDraft: DI.modules.issue.saveIssueDraft,
      submitIssue: DI.modules.issue.submitIssue
    };

    document.addEventListener("click", (event) => {
      const modeButton = event.target.closest("[data-mode]");
      if (modeButton) switchMode(modeButton.dataset.mode);

      const actionButton = event.target.closest("[data-action]");
      if (actionButton && actionMap[actionButton.dataset.action]) {
        actionMap[actionButton.dataset.action]();
      }

      const inventoryRowButton = event.target.closest("[data-inventory-id]");
      if (inventoryRowButton) {
        const nextId = inventoryRowButton.dataset.inventoryId;
        const clickY = event.clientY;
        const rowOffsetY = findElementPointerOffset(inventoryRowButton, clickY);
        const isCollapsingSelectedRow = DI.state.selectedInventoryId === nextId;
        const restorePointerPosition = captureElementPointerPosition(() => findInventoryRowElement(nextId), clickY, rowOffsetY);
        if (isCollapsingSelectedRow && DI.modules.inventory.preserveSelectedDetailSpace) {
          DI.modules.inventory.preserveSelectedDetailSpace();
        }
        DI.state.selectedInventoryId = DI.state.selectedInventoryId === nextId ? "" : nextId;
        DI.state.inventoryLogOpen = false;
        DI.modules.log.appendLog(DI.state.selectedInventoryId ? `查看庫存詳細資料：${DI.state.selectedInventoryId}` : "收合庫存詳細資料", "info", false);
        DI.modules.inventory.renderSelectedInlineDetail({ keepScrollSpacers: isCollapsingSelectedRow });
        restorePointerPosition();
      }

      const inventorySortButton = event.target.closest("[data-inventory-sort]");
      if (inventorySortButton && DI.modules.inventory.sortInventoryBy) {
        DI.modules.inventory.sortInventoryBy(inventorySortButton.dataset.inventorySort);
      }

      const inventoryLogToggle = event.target.closest("[data-inventory-log-toggle]");
      if (inventoryLogToggle) {
        const clickY = event.clientY;
        const toggleOffsetY = findElementPointerOffset(inventoryLogToggle, clickY);
        const restorePointerPosition = captureElementPointerPosition("[data-inventory-log-toggle]", clickY, toggleOffsetY);
        DI.state.inventoryLogOpen = !DI.state.inventoryLogOpen;
        DI.modules.inventory.renderSelectedInlineDetail();
        restorePointerPosition();
      }

      const inboundRemove = event.target.closest("[data-remove-inbound]");
      if (inboundRemove) DI.modules.inbound.removeInboundItem(inboundRemove.dataset.removeInbound);

      const stocktakeRemove = event.target.closest("[data-remove-stocktake]");
      if (stocktakeRemove) DI.modules.stocktake.removeStocktakeItem(stocktakeRemove.dataset.removeStocktake);

      const issueRemove = event.target.closest("[data-remove-issue]");
      if (issueRemove) DI.modules.issue.removeIssueItem(issueRemove.dataset.removeIssue);
    });

    document.addEventListener("input", (event) => {
      if (event.target.id === "inventorySearch") {
        const selectionStart = event.target.selectionStart ?? event.target.value.length;
        const selectionEnd = event.target.selectionEnd ?? event.target.value.length;
        DI.state.inventoryQuery = event.target.value;
        DI.modules.log.appendLog(`搜尋庫存：${DI.state.inventoryQuery || "清除搜尋"}`, "info", false);
        renderApp();
        restoreInputFocus("inventorySearch", selectionStart, selectionEnd);
      }
      if (event.target.id === "inboundCode") DI.modules.inbound.fillDressingFields(event.target.value);
      if (event.target.id === "stocktakeCode" || event.target.id === "stocktakeActualQty") DI.modules.stocktake.fillStocktakeFields();
      if (event.target.id === "issueCode") DI.modules.issue.fillIssueFields(event.target.value);
    });

    document.addEventListener("change", (event) => {
      if (event.target.id === "inventoryLocationFilter") {
        DI.state.locationFilter = event.target.value;
        DI.modules.log.appendLog(`修改位置篩選：${DI.state.locationFilter}`, "info");
      }
      if (event.target.id === "inventoryStatusFilter") {
        DI.state.statusFilter = event.target.value;
        DI.modules.log.appendLog(`修改狀態篩選：${DI.state.statusFilter}`, "info");
      }
      if (event.target.id === "stocktakeLocation") DI.modules.stocktake.fillStocktakeFields();
      if (event.target.id === "issuePriceStatus") DI.modules.log.appendLog(`修改 HIS 計價狀態：${event.target.value}`, "info");
    });
  }

  function markLoadingTaskReady(task) {
    document.documentElement.setAttribute("data-skhps-" + task + "-ready", "true");
    document.documentElement.setAttribute("data-skhps-page-ready", "true");
  }

  function markLoadingTaskFailed(task) {
    document.documentElement.setAttribute("data-skhps-" + task + "-ready", "false");
    document.documentElement.setAttribute("data-skhps-page-ready", "true");
  }

  function readyLoadingGate() {
    markLoadingTaskReady(config.loadingTask);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done(config.loadingTask);
      return;
    }

    fallbackLoadingRelease();
  }

  function failLoadingGate(error) {
    markLoadingTaskFailed(config.loadingTask);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(config.loadingTask, error);
      return;
    }

    fallbackLoadingRelease();
  }

  function fallbackLoadingRelease() {
    document.documentElement.classList.remove("skhps-loading");
    document.documentElement.classList.remove("skhps-main-loading");
  }

  function showBootstrapError(error) {
    const root = document.getElementById("workspaceArea") || document.getElementById("dressingInventoryApp");
    if (root) {
      root.innerHTML = `
        <section class="panel">
          <h2>模組載入失敗</h2>
          <div class="error">${DI.utils.escapeHtml(error && error.message ? error.message : String(error))}</div>
        </section>
      `;
    }
    failLoadingGate(error);
  }

  function initApp() {
    initUtils();

    if (!config) {
      showBootstrapError(new Error("DressingInventoryConfig missing"));
      return;
    }

    DI.config = config;

    loadAjaxModules()
      .then(() => {
        initState();
        bindEvents();
        DI.modules.log.appendLog("dressing-inventory mock runtime initialized", "success", false);
        renderApp();
        readyLoadingGate();
      })
      .catch(showBootstrapError);
  }

  Object.assign(DI, {
    loadScript,
    loadAjaxModules,
    initApp,
    bindEvents,
    readyLoadingGate,
    failLoadingGate,
    renderApp,
    switchMode
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
