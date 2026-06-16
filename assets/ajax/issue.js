(function () {
  "use strict";

  const DI = window.DressingInventory;

  function renderLineItems() {
    const { escapeHtml } = DI.utils;
    const rows = DI.state.issueItems;
    if (!rows.length) return `<div class="empty" style="margin-top: 14px;">目前沒有領用明細。</div>`;
    return `
      <div class="table-wrap" style="margin-top: 14px;">
        <table>
          <thead><tr><th>院內碼</th><th>敷料名稱</th><th>規格</th><th>批號</th><th>效期</th><th>數量</th><th>HIS</th><th>病歷號</th><th>主治</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.spec)}</td><td>${escapeHtml(row.lot)}</td><td>${escapeHtml(row.expiry)}</td><td>${row.quantity}</td><td>${escapeHtml(row.priceStatus)}</td><td>${escapeHtml(row.chartNo)}</td><td>${escapeHtml(row.doctor)}</td><td><button class="danger-button" type="button" data-remove-issue="${row.id}">移除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderIssue() {
    const { $, optionList } = DI.utils;
    $("workspaceArea").innerHTML = `
      <h2>領用</h2>
      <div class="field-grid">
        <label>領用人
          <select id="issueStaff">${optionList(DI.mock.mockStaff, DI.mock.mockStaff[0])}</select>
        </label>
        <label>領用單位
          <select id="issueLocation">${optionList(DI.mock.locations, "5A")}</select>
        </label>
        <label>病歷號
          <input id="issueChartNo" placeholder="病歷號">
        </label>
        <label>主治醫師
          <select id="issueDoctor">${optionList(DI.mock.mockDoctors, DI.mock.mockDoctors[0])}</select>
        </label>
        <label>HIS 計價狀態
          <select id="issuePriceStatus">${optionList(DI.mock.priceStatuses, "待確認")}</select>
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
      ${renderLineItems()}
    `;
  }

  function fillIssueFields(input) {
    const { $ } = DI.utils;
    const inventory = DI.utils.findBestInventory(input, $("issueLocation")?.value);
    $("issueLotExpiry").value = inventory ? `${inventory.lot} / ${inventory.expiry}` : "";
  }

  function addIssueItem() {
    const { $, rowId } = DI.utils;
    const location = $("issueLocation").value;
    const inventory = DI.utils.findBestInventory($("issueCode").value, location);
    if (!inventory) return DI.modules.log.setError("找不到對應的 mock 庫存，請輸入院內碼或條碼。");
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
    DI.state.issueItems.push(item);
    DI.state.issueDraftStatus = "已新增明細";
    $("issueLotExpiry").value = `${item.lot} / ${item.expiry}`;
    DI.modules.log.setSuccess(`${item.staff} 從 ${item.location} 領用 ${item.name} ${item.spec} ${item.quantity} 給 ${item.chartNo}，主治 ${item.doctor}，${item.priceStatus}。`, false);
    DI.modules.log.appendLog(`新增領用明細：${item.code} ${item.name} ${item.quantity} ${item.priceStatus}`, "success");
  }

  function removeIssueItem(rowIdValue) {
    DI.state.issueItems = DI.state.issueItems.filter((row) => row.id !== rowIdValue);
    DI.modules.log.appendLog("移除領用明細", "warn");
    DI.renderApp();
  }

  function saveIssueDraft() {
    DI.state.issueDraftStatus = "mock 草稿成功";
    DI.modules.log.setSuccess(`已 mock 儲存 ${DI.state.issueItems.length} 筆領用草稿`, false);
    DI.modules.log.appendLog("mock save success：領用草稿", "success");
  }

  function submitIssue() {
    DI.state.issueDraftStatus = "mock 送出成功";
    const summaries = DI.state.issueItems.map((item) => `${item.staff} 從 ${item.location} 領用 ${item.name} ${item.spec} ${item.quantity} 給 ${item.chartNo}，主治 ${item.doctor}，${item.priceStatus}。`);
    DI.modules.log.setSuccess(summaries.at(-1) || "尚無領用明細可送出", false);
    DI.modules.log.appendLog("mock submit success：領用送出", "success");
  }

  DI.modules.issue = {
    renderIssue,
    addIssueItem,
    removeIssueItem,
    saveIssueDraft,
    submitIssue,
    fillIssueFields
  };
})();
