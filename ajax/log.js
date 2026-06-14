(function () {
  "use strict";

  const DI = window.DressingInventory;

  function renderLogItems() {
    const { escapeHtml } = DI.utils;
    return DI.state.logs.map((log) => `<div class="log-item ${escapeHtml(log.level)}"><strong>${escapeHtml(log.time)}</strong> ${escapeHtml(log.message)}</div>`).join("") || `<div class="empty">尚無操作紀錄。</div>`;
  }

  function renderLog() {
    const { $ } = DI.utils;
    const logArea = $("logArea");
    if (!logArea) return;
    logArea.innerHTML = `
      <h2>操作紀錄 / 診斷</h2>
      <div class="log-list">
        ${renderLogItems()}
      </div>
    `;
  }

  function appendLog(message, level = "info", shouldRender = true) {
    DI.state.logs.unshift({
      message,
      level,
      time: new Date().toLocaleTimeString("zh-TW", { hour12: false })
    });
    DI.state.logs = DI.state.logs.slice(0, 40);
    if (shouldRender) DI.renderApp();
  }

  function setSuccess(message, shouldRender = true) {
    DI.state.lastSuccess = message;
    DI.state.lastError = "";
    if (shouldRender) DI.renderApp();
  }

  function setError(message) {
    DI.state.lastError = message;
    DI.state.lastSuccess = "";
    appendLog(message, "error", false);
    DI.renderApp();
  }

  DI.modules.log = { appendLog, renderLog, renderLogItems, setSuccess, setError };
})();
