(function () {
  "use strict";

  const DI = window.DressingInventory;

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

  DI.mock = {
    modes,
    locations,
    units,
    priceStatuses,
    mockDressings,
    mockInventory,
    mockStaff,
    mockDoctors
  };
})();
