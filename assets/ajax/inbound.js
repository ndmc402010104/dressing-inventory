(function () {
  "use strict";

  const DI = window.DressingInventory;

  function renderLineItems() {
    const { escapeHtml } = DI.utils;
    const rows = DI.state.inboundItems;
    if (!rows.length) return `<div class="empty" style="margin-top: 14px;">目前沒有入庫明細。</div>`;
    return `
      <div class="table-wrap" style="margin-top: 14px;">
        <table>
          <thead><tr><th>院內碼</th><th>敷料名稱</th><th>規格</th><th>批號</th><th>效期</th><th>位置</th><th>數量</th><th>單位</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.spec)}</td><td>${escapeHtml(row.lot)}</td><td>${escapeHtml(row.expiry)}</td><td>${escapeHtml(row.location)}</td><td>${row.quantity}</td><td>${escapeHtml(row.unit)}</td><td><button class="danger-button" type="button" data-remove-inbound="${row.id}">移除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderInbound() {
    const { $, optionList } = DI.utils;
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
          <select id="inboundLocation">${optionList(DI.mock.locations, "5A")}</select>
        </label>
        <label>入庫數量
          <input id="inboundQty" type="number" min="1" value="1">
        </label>
        <label>單位
          <select id="inboundUnit">${optionList(DI.mock.units, "片")}</select>
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
      ${renderLineItems()}
    `;
  }

  function fillDressingFields(input) {
    const { $ } = DI.utils;
    const dressing = DI.utils.findDressing(input);
    $("inboundName").value = dressing?.name || "";
    $("inboundSpec").value = dressing?.spec || "";
  }

  function addInboundItem() {
    const { $, rowId } = DI.utils;
    const dressing = DI.utils.findDressing($("inboundCode").value);
    if (!dressing) return DI.modules.log.setError("找不到對應的 mock 敷料，請輸入院內碼或條碼。");
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
    DI.state.inboundItems.push(item);
    DI.state.inboundDraftStatus = "已新增明細";
    DI.modules.log.setSuccess(`已新增入庫：${item.name} ${item.spec} ${item.quantity}${item.unit}`, false);
    DI.modules.log.appendLog(`新增入庫明細：${item.code} ${item.name} ${item.quantity}${item.unit}`, "success");
  }

  function removeInboundItem(rowIdValue) {
    DI.state.inboundItems = DI.state.inboundItems.filter((row) => row.id !== rowIdValue);
    DI.modules.log.appendLog("移除入庫明細", "warn");
    DI.renderApp();
  }

  function saveInboundDraft() {
    DI.state.inboundDraftStatus = "mock 暫存成功";
    DI.modules.log.setSuccess(`已暫存 ${DI.state.inboundItems.length} 筆入庫明細`, false);
    DI.modules.log.appendLog("mock save success：入庫暫存", "success");
  }

  function submitInbound() {
    DI.state.inboundDraftStatus = "mock 送出成功";
    DI.modules.log.setSuccess(`已 mock 送出入庫，總數量 ${DI.modules.summary.sum(DI.state.inboundItems, "quantity")}`, false);
    DI.modules.log.appendLog("mock submit success：入庫送出", "success");
  }

  DI.modules.inbound = {
    renderInbound,
    addInboundItem,
    removeInboundItem,
    saveInboundDraft,
    submitInbound,
    fillDressingFields
  };
})();
