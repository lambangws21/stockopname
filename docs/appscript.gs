// Satu Apps Script untuk Stock Implant, External Sheet, History, KPI,
// Scanner, Backup/PDF, dan Customer Mapping.
const APP_VERSION = 27;
const DEFAULT_SHEET = "Sheet1";
const LOW_STOCK_THRESHOLD = 1;
const STOCK_WARNING_SHEET = "StockWarnings";
const HANDOVER_SHEET = "OnlineHandover";
const STOCK_SPREADSHEET_ID =
  "1vGg0gPbaedxuVbvQhXy4oh9sX34RYHF-B3SJySuORkw";
const STOCK_SHEET_GID = "136121031";
const IMPLANT_OPTIONS = [
  "TKR",
  "BIPOLAR",
  "THR",
  "INSERT TKR",
  "HEAD METAL",
  "HEAD CERAMIC",
  "FEMORAL COMPONENT",
  "TIBIAL COMPONENT",
  "STEM FEMUR",
  "AKSESORIS",
  "BONE CEMENT",
  "CUP ACETABULUM",
  "LINER CUP",
  "LINER BIPOLAR",
  "BONE SCREW",
  "STEM TKR",
];
const BRAND_OPTIONS = ["ZIMMER", "NORMMED"];

const ADMIN_EMAILS = ["lambangws21@gmail.com"];
const BACKUP_FOLDER_ID = "1_y8hc--3PdA-_t07lW1p_TO7VDuSky47";
const EXTERNAL_SOURCE_URL_DEFAULT =
  "https://docs.google.com/spreadsheets/d/1vGg0gPbaedxuVbvQhXy4oh9sX34RYHF-B3SJySuORkw/edit?gid=136121031#gid=136121031";
const EXTERNAL_SOURCE_GID_DEFAULT = "136121031";
const EXTERNAL_TARGET_SHEET_DEFAULT = "ExternalImport";
const CUSTOMER_SHEET = "CustomerMapping";
const CUSTOMER_HISTORY_SHEET = "CustomerHistory";
const CUSTOMER_USAGE_SHEET = "CustomerUsageHistory";
const DOCTOR_PHOTO_FOLDER_ID = "1_y8hc--3PdA-_t07lW1p_TO7VDuSky47";
const STOCK_HISTORY_HEADERS = [
  "Timestamp",
  "Action",
  "Sheet",
  "No",
  "Changes",
  "By",
];
const STOCK_WARNING_HEADERS = [
  "UpdatedAt",
  "Status",
  "StockSheet",
  "No",
  "NoStok",
  "Deskripsi",
  "Implant",
  "Brand",
  "Batch",
  "SisaStock",
  "Note",
  "LastMovement",
  "ResolvedAt",
  "WorkflowStatus",
  "PIC",
  "TargetRefill",
  "LogisticsNote",
  "InformedAt",
  "InformedBy",
];
const HANDOVER_HEADERS = [
  "ID",
  "CreatedAt",
  "UpdatedAt",
  "Procedure",
  "Brand",
  "Hospital",
  "Surgeon",
  "ApprovedBy",
  "HandoverDate",
  "SetName",
  "ItemsJson",
  "InstrumentsJson",
  "Sender",
  "Checker1",
  "Checker2",
  "AcknowledgedBy",
  "Receiver",
  "Status",
  "SentAt",
  "AcceptedAt",
  "AcceptanceNote",
  "By",
  "SenderSignature",
  "ReceiverSignature",
  "InventoryPostedAt",
  "HospitalUpdatedAt",
];
const CUSTOMER_HISTORY_HEADERS = [
  "Timestamp",
  "CustomerID",
  "Action",
  "Before",
  "After",
  "By",
];

const CUSTOMER_HEADERS = [
  "ID",
  "CustomerType",
  "Territory",
  "Hospital",
  "Doctor",
  "Note",
  "Plan",
  "Priority",
  "Status",
  "Owner",
  "ApprovedBy",
  "ApprovedAt",
  "CreatedAt",
  "UpdatedAt",
  "SourceFile",
  "SourceRow",
  "JourneyStage",
  "ProductOffered",
  "OfferedAt",
  "FirstUsedAt",
  "LastUsedAt",
  "UsageCount",
  "NextFollowUp",
  "Outcome",
  "Phone",
  "Specialty",
  "PracticeHospital2",
  "PracticeHospital3",
  "PhotoUrl",
  "PhotoFileId",
  "ImplantUsed",
  "ProcedureType",
  "UsageHospital",
  "MonthlyCaseCount",
  "OrthopedicCaseTypes",
  "ImplantVendors",
  "VendorSupport",
];

const CUSTOMER_USAGE_HEADERS = [
  "UsageID",
  "Timestamp",
  "CustomerID",
  "Doctor",
  "CustomerType",
  "Territory",
  "Hospital",
  "ProductUsed",
  "ProcedureType",
  "UsageType",
  "UsageSequence",
  "ProductOffered",
  "Note",
  "Planning",
  "Outcome",
  "Owner",
  "RecordedBy",
];

const MASTER_HEADERS = [
  "NoStok",
  "Deskripsi",
  "Implant",
  "Brand",
  "Batch",
  "Qty",
  "TotalQty",
  "TERPAKAI",
  "REFILL",
  "KET",
];

function cors(json) {
  return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doOptions() {
  return cors({ ok: true });
}

function safeNumber(value) {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/\s+/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(/,(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const n = Number(normalized);
    return isNaN(n) ? 0 : n;
  }

  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseSpreadsheetId(urlOrId) {
  const raw = String(urlOrId || "").trim();
  if (!raw) return "";

  const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(raw)) return raw;
  return "";
}

function parseGidFromUrl(url) {
  const raw = String(url || "");
  const match = raw.match(/[?&#]gid=(\d+)/);
  return match && match[1] ? match[1] : "";
}

function findSheetByGid(spreadsheet, gidRaw) {
  const gidStr = String(gidRaw || "").trim();
  if (!/^\d+$/.test(gidStr)) return null;

  const gid = Number(gidStr);
  const sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

function getApplicationSpreadsheet() {
  const configuredId = String(STOCK_SPREADSHEET_ID || "").trim();
  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const active = SpreadsheetApp.getActive();
  if (!active) {
    throw new Error(
      "Spreadsheet target tidak ditemukan. Isi STOCK_SPREADSHEET_ID."
    );
  }
  return active;
}

function getOrCreateSheet(name) {
  const ss = getApplicationSpreadsheet();
  const sheetName = String(name || "").trim() || DEFAULT_SHEET;
  if (sheetName === DEFAULT_SHEET) {
    const configuredStockSheet = findSheetByGid(ss, STOCK_SHEET_GID);
    if (configuredStockSheet) return configuredStockSheet;
  }
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function resolveDataSheet(input) {
  const params = input || {};
  const sheetName = params.sheet || DEFAULT_SHEET;
  const sourceUrl = params.sourceUrl || "";
  const sourceId = params.sourceId || parseSpreadsheetId(sourceUrl);
  const sourceSheetName = params.sourceSheet || "";
  const sourceGid = String(
    params.sourceGid || parseGidFromUrl(sourceUrl) || ""
  ).trim();

  if (!sourceId) {
    return getSheet(sheetName);
  }

  const externalSpreadsheet = SpreadsheetApp.openById(sourceId);
  let externalSheet = null;

  if (String(sourceSheetName).trim()) {
    externalSheet = externalSpreadsheet.getSheetByName(String(sourceSheetName).trim());
  }

  if (!externalSheet && sourceGid) {
    externalSheet = findSheetByGid(externalSpreadsheet, sourceGid);
  }

  if (!externalSheet && String(sheetName).trim()) {
    externalSheet = externalSpreadsheet.getSheetByName(String(sheetName).trim());
  }

  if (!externalSheet) {
    externalSheet = externalSpreadsheet.getSheets()[0];
  }

  if (!externalSheet) {
    throw new Error("External source sheet not found");
  }

  return externalSheet;
}

function getSheet(name) {
  const ss = getApplicationSpreadsheet();
  if (name === DEFAULT_SHEET) {
    const configuredStockSheet = findSheetByGid(ss, STOCK_SHEET_GID);
    if (configuredStockSheet) return configuredStockSheet;
  }
  let sheet = ss.getSheetByName(name);
  if (sheet) return sheet;

  if (name === "History") {
    sheet = ss.insertSheet("History");
    sheet.appendRow(STOCK_HISTORY_HEADERS);
    return sheet;
  }

  throw new Error("Sheet not found: " + name);
}

function ensureHeaderRow(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const firstRow = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0];
  const hasContent = firstRow.some(function (value) {
    return String(value || "").trim() !== "";
  });
  const looksLikeHeader = headers.some(function (header, index) {
    return String(firstRow[index] || "").trim() === header;
  });

  if (hasContent && !looksLikeHeader) {
    sheet.insertRowsBefore(1, 1);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function normalizeSheet(sheet) {
  if (!sheet) throw new Error("Sheet is required");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(MASTER_HEADERS);
    return;
  }

  let existingHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];

  // Versi lama memiliki kolom No. ID sekarang memakai nomor baris internal,
  // sehingga kolom No dapat dihapus dari data yang terlihat.
  if (existingHeaders[0] === "No") {
    sheet.deleteColumn(1);
    existingHeaders = sheet
      .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
      .getValues()[0];
  }

  const hasRecognizableHeader =
    existingHeaders[0] === "NoStok" ||
    existingHeaders[1] === "Deskripsi";
  const hasFirstRowData = existingHeaders.some(function (value) {
    return String(value || "").trim() !== "";
  });

  if (hasFirstRowData && !hasRecognizableHeader) {
    sheet.insertRowsBefore(1, 1);
  }

  // Migrasi aman dari format lama: sisipkan Implant dan Brand,
  // sehingga data Batch/Qty lama tidak tertimpa atau bergeser salah.
  if (
    existingHeaders[0] === "NoStok" &&
    existingHeaders[1] === "Deskripsi" &&
    existingHeaders[2] === "Batch"
  ) {
    sheet.insertColumnsAfter(2, 2);
  }

  const current = sheet.getRange(1, 1, 1, MASTER_HEADERS.length).getValues()[0];
  const fixed = MASTER_HEADERS.map(function (h, i) {
    return current[i] === h ? current[i] : h;
  });
  sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([fixed]);
}

function setupStockSheet() {
  const sheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(sheet);

  const header = sheet.getRange(1, 1, 1, MASTER_HEADERS.length);
  header
    .setValues([MASTER_HEADERS])
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#18181b")
    .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);

  const availableRows = Math.max(sheet.getMaxRows() - 1, 1);
  const implantValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(IMPLANT_OPTIONS, true)
    .setAllowInvalid(false)
    .setHelpText("Pilih jenis implant: " + IMPLANT_OPTIONS.join(", "))
    .build();
  const brandValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(BRAND_OPTIONS, true)
    .setAllowInvalid(false)
    .setHelpText("Pilih brand: " + BRAND_OPTIONS.join(", "))
    .build();

  sheet.getRange(2, 3, availableRows, 1).setDataValidation(implantValidation);
  sheet.getRange(2, 4, availableRows, 1).setDataValidation(brandValidation);
  sheet.getRange(2, 7, availableRows, 1).setBackground("#f4f4f5");

  const widths = [130, 260, 110, 120, 130, 75, 90, 90, 80, 220];
  widths.forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  syncTotalQty(sheet);
  return {
    status: "success",
    sheet: sheet.getName(),
    headers: MASTER_HEADERS,
    message: "Header dan validasi Sheet1 berhasil diperbarui",
  };
}

function setupApplicationSheets() {
  const spreadsheet = getApplicationSpreadsheet();
  const stockResult = setupStockSheet();

  const historySheet = getOrCreateSheet("History");
  ensureHeaderRow(historySheet, STOCK_HISTORY_HEADERS);
  historySheet
    .getRange(1, 1, 1, STOCK_HISTORY_HEADERS.length)
    .setValues([STOCK_HISTORY_HEADERS])
    .setBackground("#3f3f46")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  historySheet.setFrozenRows(1);
  historySheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");

  const warningSheet = getOrCreateSheet(STOCK_WARNING_SHEET);
  ensureHeaderRow(warningSheet, STOCK_WARNING_HEADERS);
  warningSheet
    .getRange(1, 1, 1, STOCK_WARNING_HEADERS.length)
    .setValues([STOCK_WARNING_HEADERS])
    .setBackground("#b91c1c")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  warningSheet.setFrozenRows(1);
  warningSheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  warningSheet.getRange("M:M").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  warningSheet.getRange("P:P").setNumberFormat("yyyy-mm-dd");
  warningSheet.getRange("R:R").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  warningSheet.setColumnWidth(6, 280);
  warningSheet.setColumnWidth(11, 330);
  warningSheet.setColumnWidth(12, 280);

  const customerSheet = getCustomerSheet();
  const customerHistorySheet = getCustomerHistorySheet();
  const customerUsageSheet = getCustomerUsageSheet();
  const handoverSheet = getOrCreateSheet(HANDOVER_SHEET);
  ensureHeaderRow(handoverSheet, HANDOVER_HEADERS);
  handoverSheet
    .getRange(1, 1, 1, HANDOVER_HEADERS.length)
    .setValues([HANDOVER_HEADERS])
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  handoverSheet.setFrozenRows(1);
  handoverSheet.getRange("B:C").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  handoverSheet.getRange("I:I").setNumberFormat("yyyy-mm-dd");
  handoverSheet.getRange("S:T").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  handoverSheet.getRange("Y:Z").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  syncStockWarnings();

  return {
    status: "success",
    message: "Semua sheet dan header aplikasi tersedia",
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheets: [
      stockResult.sheet,
      historySheet.getName(),
      warningSheet.getName(),
      customerSheet.getName(),
      customerHistorySheet.getName(),
      customerUsageSheet.getName(),
      handoverSheet.getName(),
    ],
  };
}

function getHandoverSheet() {
  const sheet = getOrCreateSheet(HANDOVER_SHEET);
  ensureHeaderRow(sheet, HANDOVER_HEADERS);
  return sheet;
}

function listHandovers(params) {
  const sheet = getHandoverSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { status: "success", data: [] };
  const headers = rows[0];
  const targetId = String((params && params.id) || "").trim();
  const data = rows
    .slice(1)
    .map(function (row, index) {
      const item = { Row: index + 2 };
      headers.forEach(function (header, column) {
        item[header] = row[column] === undefined ? "" : row[column];
      });
      try {
        item.Items = JSON.parse(String(item.ItemsJson || "[]"));
      } catch (err) {
        item.Items = [];
      }
      try {
        item.Instruments = JSON.parse(String(item.InstrumentsJson || "[]"));
      } catch (err) {
        item.Instruments = [];
      }
      delete item.ItemsJson;
      delete item.InstrumentsJson;
      // Daftar dokumen dipakai dashboard dan tidak perlu membawa data gambar
      // tanda tangan yang besar. Detail lengkap hanya dikirim saat id diminta.
      if (!targetId) {
        item.SenderSignature = "";
        item.ReceiverSignature = "";
        item.Instruments = [];
      }
      return item;
    })
    .filter(function (item) {
      return !targetId || String(item.ID) === targetId;
    })
    .reverse();
  return { status: "success", data: data };
}

function resolveHandoverStockRow(stockRows, item) {
  const requestedRow = safeNumber(item.stockRow);
  if (requestedRow >= 2 && requestedRow <= stockRows.length) {
    const candidate = rowArrayToObject(stockRows[requestedRow - 1], requestedRow);
    if (
      String(candidate.NoStok) === String(item.partNumber) &&
      String(candidate.Batch) === String(item.batch)
    ) {
      return requestedRow;
    }
  }
  for (var i = 1; i < stockRows.length; i++) {
    if (
      String(stockRows[i][0]) === String(item.partNumber) &&
      String(stockRows[i][4]) === String(item.batch)
    ) {
      return i + 1;
    }
  }
  return 0;
}

function buildHistoryBatchRow(entry) {
  const before = entry.before || {};
  const after = entry.after || {};
  const fields = {};
  Object.keys(before).forEach(function (key) {
    fields[key] = true;
  });
  Object.keys(after).forEach(function (key) {
    fields[key] = true;
  });
  const changes = [];
  Object.keys(fields).forEach(function (field) {
    if (String(before[field]) !== String(after[field])) {
      changes.push({
        field: field,
        before: before[field] === undefined ? "" : String(before[field]),
        after: after[field] === undefined ? "" : String(after[field]),
      });
    }
  });
  if (!changes.length) return null;
  return [
    new Date(),
    entry.action,
    entry.sheetName || DEFAULT_SHEET,
    safeNumber(entry.no),
    JSON.stringify(changes),
    entry.by || Session.getActiveUser().getEmail() || "",
  ];
}

function appendHistoryBatch(entries) {
  const values = (entries || [])
    .map(buildHistoryBatchRow)
    .filter(function (row) {
      return Boolean(row);
    });
  if (!values.length) return;
  const sheet = getSheet("History");
  sheet
    .getRange(sheet.getLastRow() + 1, 1, values.length, STOCK_HISTORY_HEADERS.length)
    .setValues(values);
}

function updateWarningsBatch(entries) {
  if (!entries || !entries.length) return;
  const sheet = getStockWarningSheet();
  const rows = sheet.getDataRange().getValues();
  const output = rows.length > 1 ? rows.slice(1) : [];
  const indexByKey = {};
  output.forEach(function (row, index) {
    indexByKey[
      [String(row[2]), String(row[4]), String(row[8])].join("|")
    ] = index;
  });

  entries.forEach(function (entry) {
    const stockRow = entry.stockRow;
    const key = [
      String(entry.sheetName || DEFAULT_SHEET),
      String(stockRow.NoStok || "").trim(),
      String(stockRow.Batch || "").trim(),
    ].join("|");
    const targetIndex =
      indexByKey[key] === undefined ? -1 : indexByKey[key];
    const existing = targetIndex >= 0 ? output[targetIndex] : [];
    const remaining = safeNumber(stockRow.TotalQty);
    const isWarning = remaining <= LOW_STOCK_THRESHOLD;
    if (!isWarning && targetIndex < 0) return;
    const now = new Date();
    const wasResolved = String(existing[1] || "") === "SELESAI";
    const workflowStatus = isWarning
      ? wasResolved || !existing[13]
        ? "BELUM DIPROSES"
        : existing[13]
      : "SELESAI";
    const values = [
      now,
      isWarning ? (remaining <= 0 ? "HABIS" : "AKAN HABIS") : "SELESAI",
      entry.sheetName || DEFAULT_SHEET,
      safeNumber(entry.no),
      stockRow.NoStok || "",
      stockRow.Deskripsi || "",
      stockRow.Implant || "",
      stockRow.Brand || "",
      stockRow.Batch || "",
      remaining,
      isWarning
        ? remaining <= 0
          ? "WARNING: Implant sudah habis dan tidak tersedia lagi. Segera lakukan refill."
          : "WARNING: Sisa 1. Jika digunakan lagi implant akan habis dan tidak tersedia."
        : "Stok sudah tersedia kembali.",
      entry.lastMovement || stockRow.KET || "",
      isWarning ? "" : now,
      workflowStatus,
      existing[14] || "",
      existing[15] || "",
      existing[16] || "",
      existing[17] || "",
      existing[18] || "",
    ];
    if (targetIndex >= 0) {
      output[targetIndex] = values;
    } else {
      indexByKey[key] = output.length;
      output.push(values);
    }
  });

  if (output.length) {
    sheet
      .getRange(2, 1, output.length, STOCK_WARNING_HEADERS.length)
      .setValues(
        output.map(function (row) {
          return STOCK_WARNING_HEADERS.map(function (_header, index) {
            return row[index] === undefined ? "" : row[index];
          });
        })
      );
  }
}

function dispatchHandoverInventory(payload) {
  const stockSheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(stockSheet);
  const stockRows = stockSheet.getDataRange().getValues();
  const items = Array.isArray(payload.Items) ? payload.Items : [];
  const requiredByRow = {};
  const resolvedRows = [];

  items.forEach(function (item) {
    const qty = item.selected
      ? Math.max(0, safeNumber(item.qtyIssued))
      : 0;
    const requirement = Math.max(0, safeNumber(item.stdQty));
    if (qty > requirement) {
      throw new Error(
        "Jumlah kirim " +
          String(item.partNumber || "-") +
          " melebihi kebutuhan RS (" +
          requirement +
          " pcs)"
      );
    }
    const rowNumber = resolveHandoverStockRow(stockRows, item);
    resolvedRows.push(rowNumber);
    if (qty <= 0) return;
    if (!rowNumber) {
      throw new Error(
        "Stock " + String(item.partNumber || "-") + " tidak ditemukan"
      );
    }
    requiredByRow[rowNumber] = safeNumber(requiredByRow[rowNumber]) + qty;
  });

  Object.keys(requiredByRow).forEach(function (rowKey) {
    const rowNumber = safeNumber(rowKey);
    const available = safeNumber(stockRows[rowNumber - 1][5]);
    if (available < requiredByRow[rowKey]) {
      throw new Error(
        "Stock " +
          String(stockRows[rowNumber - 1][0] || "-") +
          " tidak cukup. Tersedia " +
          available +
          ", diminta " +
          requiredByRow[rowKey]
      );
    }
  });

  const historyEntries = [];
  const warningEntries = [];
  const preparedItems = items.map(function (item, index) {
    const qty = item.selected
      ? Math.max(0, safeNumber(item.qtyIssued))
      : 0;
    const rowNumber = resolvedRows[index];
    const officeBefore = rowNumber
      ? safeNumber(stockRows[rowNumber - 1][5])
      : 0;
    if (qty > 0) {
      const stockIndex = rowNumber - 1;
      const before = rowArrayToObject(stockRows[stockIndex], rowNumber);
      const updated = stockRows[stockIndex].slice();
      updated[5] = safeNumber(updated[5]) - qty;
      updated[6] = updated[5];
      updated[9] = buildMovementDescription(
        "MOBILISASI_KELUAR",
        qty,
        "Serah terima " +
          String(payload.ID || "") +
          " ke " +
          String(payload.Hospital || "rumah sakit")
      );
      stockRows[stockIndex] = updated;
      const after = rowArrayToObject(updated, rowNumber);
      historyEntries.push({
        action: "MOBILISASI_KELUAR",
        no: rowNumber,
        before: before,
        after: after,
        by: payload.by || payload.Sender || "Serah Terima Online",
      });
      warningEntries.push({
        no: rowNumber,
        stockRow: after,
        lastMovement: updated[9],
      });
    }
    return Object.assign({}, item, {
      stockRow: rowNumber,
      officeBefore: officeBefore,
      officeAfter: Math.max(0, officeBefore - qty),
      qtyIssued: qty,
      hospitalQty: qty,
      usedQty: Math.max(0, safeNumber(item.usedQty)),
      returnedQty: Math.max(0, safeNumber(item.returnedQty)),
      locationStatus: qty > 0 ? "DI RUMAH SAKIT" : "TIDAK DIKIRIM",
    });
  });
  if (historyEntries.length) {
    stockSheet
      .getRange(2, 1, stockRows.length - 1, MASTER_HEADERS.length)
      .setValues(
        stockRows.slice(1).map(function (row) {
          return row.slice(0, MASTER_HEADERS.length);
        })
      );
    appendHistoryBatch(historyEntries);
    updateWarningsBatch(warningEntries);
  }
  return preparedItems;
}

function recordHospitalImplantUsage(no, qty, note, by) {
  if (qty <= 0) return;
  const sheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(sheet);
  const rows = sheet.getDataRange().getValues();
  const index = safeNumber(no) - 1;
  if (index < 1 || index >= rows.length) {
    throw new Error("Baris stock untuk pemakaian tidak ditemukan");
  }
  const old = rows[index];
  const before = rowArrayToObject(old, no);
  const updated = old.slice();
  updated[7] = safeNumber(updated[7]) + qty;
  updated[6] = safeNumber(updated[5]);
  updated[9] = buildMovementDescription("OPERASI", qty, note);
  sheet.getRange(index + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  const after = rowArrayToObject(updated, no);
  upsertStockWarning(sheet.getName(), no, after, updated[9]);
  logHistory("OPERASI", sheet.getName(), no, before, after, by);
}

function saveHandover(payload, skipLock) {
  const lock = skipLock ? null : LockService.getScriptLock();
  if (lock && !lock.tryLock(30000)) {
    return { status: "error", message: "Transaksi sedang diproses, coba lagi" };
  }
  try {
  const sheet = getHandoverSheet();
  const rows = sheet.getDataRange().getValues();
  const now = new Date();
  const id = String(payload.ID || "").trim() || "ST-" + Utilities.getUuid();
  let rowNumber = 0;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      rowNumber = i + 1;
      break;
    }
  }
  const previous = rowNumber ? rows[rowNumber - 1] : [];
  const requestedStatus = String(payload.Status || "DRAFT").toUpperCase();
  const status = ["DRAFT", "DIKIRIM", "DITERIMA"].indexOf(requestedStatus) >= 0
    ? requestedStatus
    : "DRAFT";
  let inventoryPostedAt = previous[24] || "";
  let preparedItems = Array.isArray(payload.Items) ? payload.Items : [];
  if (status === "DIKIRIM" && !inventoryPostedAt) {
    payload.ID = id;
    preparedItems = dispatchHandoverInventory(
      Object.assign({}, payload, { Items: preparedItems })
    );
    inventoryPostedAt = now;
  } else if (inventoryPostedAt && rowNumber && !payload._allowPostedItems) {
    try {
      preparedItems = JSON.parse(String(previous[10] || "[]"));
    } catch (err) {
      preparedItems = Array.isArray(payload.Items) ? payload.Items : [];
    }
  }
  const values = [
    id,
    previous[1] || now,
    now,
    payload.Procedure || "",
    payload.Brand || "NORMMED",
    payload.Hospital || "",
    payload.Surgeon || "",
    payload.ApprovedBy || "",
    payload.HandoverDate || "",
    payload.SetName || "",
    JSON.stringify(preparedItems),
    JSON.stringify(
      Array.isArray(payload.Instruments) ? payload.Instruments : []
    ),
    payload.Sender || "",
    payload.Checker1 || "",
    payload.Checker2 || "",
    payload.AcknowledgedBy || "",
    payload.Receiver || previous[16] || "",
    status,
    status === "DIKIRIM" ? previous[18] || now : previous[18] || "",
    status === "DITERIMA" ? previous[19] || now : previous[19] || "",
    payload.AcceptanceNote || previous[20] || "",
    payload.by || Session.getActiveUser().getEmail() || "",
    payload.SenderSignature || previous[22] || "",
    payload.ReceiverSignature || previous[23] || "",
    inventoryPostedAt,
    payload.HospitalUpdatedAt || previous[25] || "",
  ];
  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, HANDOVER_HEADERS.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
  return {
    status: "success",
    ID: id,
    data: listHandovers({ id: id }).data[0],
  };
  } finally {
    if (lock) lock.releaseLock();
  }
}

function acceptHandover(payload) {
  const current = listHandovers({ id: payload.ID }).data[0];
  if (!current) {
    return { status: "error", message: "Dokumen serah terima tidak ditemukan" };
  }
  if (!String(payload.Receiver || "").trim()) {
    return { status: "error", message: "Nama penerima wajib diisi" };
  }
  current.Status = "DITERIMA";
  current.Receiver = payload.Receiver;
  current.AcceptanceNote = payload.AcceptanceNote || "";
  current.ReceiverSignature =
    payload.ReceiverSignature || current.ReceiverSignature || "";
  current.SenderSignature =
    payload.SenderSignature || current.SenderSignature || "";
  current.ReceiverSignature =
    payload.ReceiverSignature || current.ReceiverSignature || "";
  current.Items = Array.isArray(payload.Items) ? payload.Items : current.Items;
  current.Instruments = Array.isArray(payload.Instruments)
    ? payload.Instruments
    : current.Instruments;
  return saveHandover(current);
}

function settleHandoverInventory(payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { status: "error", message: "Transaksi sedang diproses, coba lagi" };
  }
  try {
    const current = listHandovers({ id: payload.ID }).data[0];
    if (!current) {
      return { status: "error", message: "Dokumen serah terima tidak ditemukan" };
    }
    if (!current.InventoryPostedAt) {
      return { status: "error", message: "Implant belum dikirim dari office" };
    }
    if (String(current.Status) !== "DITERIMA") {
      return {
        status: "error",
        message: "Dokumen harus diterima sebelum pemakaian implant dicatat",
      };
    }
    const requestedItems = Array.isArray(payload.Items) ? payload.Items : [];
    const currentItems = Array.isArray(current.Items) ? current.Items : [];
    const stockSheet = getOrCreateSheet(DEFAULT_SHEET);
    normalizeSheet(stockSheet);
    const stockRows = stockSheet.getDataRange().getValues();
    const historyEntries = [];
    const warningByRow = {};
    const updatedItems = currentItems.map(function (item, index) {
      const requested = requestedItems[index] || item;
      const hospitalQty = Math.max(0, safeNumber(item.hospitalQty));
      const previousUsed = Math.max(0, safeNumber(item.usedQty));
      const previousReturned = Math.max(0, safeNumber(item.returnedQty));
      const nextUsed = Math.max(previousUsed, safeNumber(requested.usedQty));
      const nextReturned = Math.max(
        previousReturned,
        safeNumber(requested.returnedQty)
      );
      if (nextUsed + nextReturned > hospitalQty) {
        throw new Error(
          "Pemakaian " +
            String(item.partNumber || "-") +
            " melebihi jumlah di rumah sakit"
        );
      }
      const usedDelta = nextUsed - previousUsed;
      const returnedDelta = nextReturned - previousReturned;
      const stockRow = safeNumber(item.stockRow);
      const movementNote =
        "Dokumen " +
        String(current.ID) +
        " • " +
        String(current.Hospital || "Rumah sakit");
      const stockIndex = stockRow - 1;
      if (
        (usedDelta > 0 || returnedDelta > 0) &&
        (stockIndex < 1 || stockIndex >= stockRows.length)
      ) {
        throw new Error(
          "Baris stock " + String(item.partNumber || "-") + " tidak ditemukan"
        );
      }
      if (usedDelta > 0) {
        const beforeUsed = rowArrayToObject(stockRows[stockIndex], stockRow);
        const usedRow = stockRows[stockIndex].slice();
        usedRow[7] = safeNumber(usedRow[7]) + usedDelta;
        usedRow[6] = safeNumber(usedRow[5]);
        usedRow[9] = buildMovementDescription(
          "OPERASI",
          usedDelta,
          movementNote
        );
        stockRows[stockIndex] = usedRow;
        historyEntries.push({
          action: "OPERASI",
          no: stockRow,
          before: beforeUsed,
          after: rowArrayToObject(usedRow, stockRow),
          by: payload.by || current.Receiver || "Rumah Sakit",
        });
      }
      if (returnedDelta > 0) {
        const beforeReturn = rowArrayToObject(stockRows[stockIndex], stockRow);
        const returnedRow = stockRows[stockIndex].slice();
        returnedRow[5] = safeNumber(returnedRow[5]) + returnedDelta;
        returnedRow[6] = returnedRow[5];
        returnedRow[9] = buildMovementDescription(
          "MOBILISASI_MASUK",
          returnedDelta,
          "Kembali dari " + movementNote
        );
        stockRows[stockIndex] = returnedRow;
        historyEntries.push({
          action: "MOBILISASI_MASUK",
          no: stockRow,
          before: beforeReturn,
          after: rowArrayToObject(returnedRow, stockRow),
          by: payload.by || current.Receiver || "Rumah Sakit",
        });
      }
      if (usedDelta > 0 || returnedDelta > 0) {
        warningByRow[stockRow] = {
          no: stockRow,
          stockRow: rowArrayToObject(stockRows[stockIndex], stockRow),
          lastMovement: stockRows[stockIndex][9],
        };
      }
      const remaining = hospitalQty - nextUsed - nextReturned;
      return Object.assign({}, item, {
        usedQty: nextUsed,
        returnedQty: nextReturned,
        hospitalRemaining: remaining,
        locationStatus:
          remaining > 0
            ? "DI RUMAH SAKIT"
            : nextUsed > 0 && nextReturned === 0
              ? "TERPAKAI"
              : "SELESAI",
      });
    });
    if (historyEntries.length) {
      stockSheet
        .getRange(2, 1, stockRows.length - 1, MASTER_HEADERS.length)
        .setValues(
          stockRows.slice(1).map(function (row) {
            return row.slice(0, MASTER_HEADERS.length);
          })
        );
      appendHistoryBatch(historyEntries);
      updateWarningsBatch(
        Object.keys(warningByRow).map(function (key) {
          return warningByRow[key];
        })
      );
    }
    current.Items = updatedItems;
    current.HospitalUpdatedAt = new Date();
    current.By = payload.by || current.Receiver || current.By || "";
    current._allowPostedItems = true;
    return saveHandover(current, true);
  } finally {
    lock.releaseLock();
  }
}

function getStockWarningSheet() {
  const sheet = getOrCreateSheet(STOCK_WARNING_SHEET);
  ensureHeaderRow(sheet, STOCK_WARNING_HEADERS);
  return sheet;
}

function upsertStockWarning(stockSheetName, no, stockRow, lastMovement) {
  const warningSheet = getStockWarningSheet();
  const rows = warningSheet.getDataRange().getValues();
  const noStok = String(stockRow.NoStok || "").trim();
  const batch = String(stockRow.Batch || "").trim();
  const remaining = safeNumber(stockRow.TotalQty);
  const now = new Date();
  let targetRow = 0;

  for (var i = 1; i < rows.length; i++) {
    if (
      String(rows[i][2]) === String(stockSheetName) &&
      String(rows[i][4]) === noStok &&
      String(rows[i][8]) === batch
    ) {
      targetRow = i + 1;
      break;
    }
  }

  const isWarning = remaining <= LOW_STOCK_THRESHOLD;
  const status = remaining <= 0 ? "HABIS" : "AKAN HABIS";
  const note =
    remaining <= 0
      ? "WARNING: Implant sudah habis dan tidak tersedia lagi. Segera lakukan refill."
      : "WARNING: Sisa 1. Jika digunakan lagi implant akan habis dan tidak tersedia.";

  if (!isWarning && !targetRow) return;

  const existing = targetRow ? rows[targetRow - 1] : [];
  const wasResolved = String(existing[1] || "") === "SELESAI";
  const workflowStatus = isWarning
    ? wasResolved || !existing[13]
      ? "BELUM DIPROSES"
      : existing[13]
    : "SELESAI";
  const values = [
    now,
    isWarning ? status : "SELESAI",
    stockSheetName,
    safeNumber(no),
    noStok,
    stockRow.Deskripsi || "",
    stockRow.Implant || "",
    stockRow.Brand || "",
    batch,
    remaining,
    isWarning ? note : "Stok sudah tersedia kembali.",
    lastMovement || stockRow.KET || "",
    isWarning ? "" : now,
    workflowStatus,
    existing[14] || "",
    existing[15] || "",
    existing[16] || "",
    existing[17] || "",
    existing[18] || "",
  ];

  if (targetRow) {
    warningSheet
      .getRange(targetRow, 1, 1, STOCK_WARNING_HEADERS.length)
      .setValues([values]);
  } else {
    warningSheet.appendRow(values);
  }
}

function listStockWarnings(params) {
  const sheet = getStockWarningSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { status: "success", data: [] };
  const headers = rows[0];
  const includeResolved =
    String((params && params.includeResolved) || "").toLowerCase() === "true";
  const data = rows
    .slice(1)
    .map(function (row, index) {
      const item = { Row: index + 2 };
      headers.forEach(function (header, column) {
        item[header] = row[column] === undefined ? "" : row[column];
      });
      return item;
    })
    .filter(function (item) {
      return includeResolved || String(item.Status) !== "SELESAI";
    })
    .reverse();
  return { status: "success", data: data };
}

function updateStockWarningWorkflow(payload) {
  const sheet = getStockWarningSheet();
  const rows = sheet.getDataRange().getValues();
  const rowNumber = safeNumber(payload.Row);
  if (rowNumber < 2 || rowNumber > rows.length) {
    return { status: "error", message: "Warning stock tidak ditemukan" };
  }

  const allowed = [
    "BELUM DIPROSES",
    "SUDAH DIINFORMASIKAN",
    "SEDANG DIPESAN",
    "DALAM PENGIRIMAN",
    "SELESAI",
  ];
  const current = rows[rowNumber - 1].slice();
  const nextStatus = String(payload.WorkflowStatus || current[13] || "")
    .trim()
    .toUpperCase();
  if (allowed.indexOf(nextStatus) < 0) {
    return { status: "error", message: "Status workflow tidak valid" };
  }

  current[0] = new Date();
  current[13] = nextStatus;
  current[14] = hasOwn(payload, "PIC") ? payload.PIC || "" : current[14];
  current[15] = hasOwn(payload, "TargetRefill")
    ? payload.TargetRefill || ""
    : current[15];
  current[16] = hasOwn(payload, "LogisticsNote")
    ? payload.LogisticsNote || ""
    : current[16];
  if (
    nextStatus === "SUDAH DIINFORMASIKAN" &&
    String(current[17] || "").trim() === ""
  ) {
    current[17] = new Date();
    current[18] =
      payload.by || Session.getActiveUser().getEmail() || "Logistik";
  }

  sheet
    .getRange(rowNumber, 1, 1, STOCK_WARNING_HEADERS.length)
    .setValues([current.slice(0, STOCK_WARNING_HEADERS.length)]);
  return {
    status: "success",
    data: listStockWarnings({ includeResolved: true }).data.filter(function (item) {
      return safeNumber(item.Row) === rowNumber;
    })[0],
  };
}

function syncStockWarnings() {
  const stockSheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(stockSheet);
  const rows = stockSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    upsertStockWarning(
      stockSheet.getName(),
      i + 1,
      rowArrayToObject(rows[i], i + 1),
      rows[i][9] || ""
    );
  }
  return { status: "success", message: "StockWarnings berhasil disinkronkan" };
}

function onOpen() {
  setupApplicationSheets();
  SpreadsheetApp.getUi()
    .createMenu("NEX Stock")
    .addItem("Siapkan Semua Sheet & Header", "setupApplicationSheets")
    .addItem("Perbarui Header Sheet1", "setupStockSheet")
    .addItem("Sinkronkan Total Qty", "syncDefaultStockTotal")
    .addToUi();
}

function syncDefaultStockTotal() {
  const sheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(sheet);
  syncTotalQty(sheet);
}

function onEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  const isConfiguredStockSheet =
    String(sheet.getSheetId()) === String(STOCK_SHEET_GID);
  if (!isConfiguredStockSheet && sheet.getName() !== DEFAULT_SHEET) return;

  if (range.getRow() === 1) {
    setupStockSheet();
    return;
  }

  const firstRow = Math.max(range.getRow(), 2);
  const lastRow = range.getLastRow();
  const firstColumn = range.getColumn();
  const lastColumn = range.getLastColumn();

  if (firstColumn <= 4 && lastColumn >= 3) {
    for (var classificationRow = firstRow; classificationRow <= lastRow; classificationRow++) {
      for (var classificationColumn = 3; classificationColumn <= 4; classificationColumn++) {
        if (
          classificationColumn >= firstColumn &&
          classificationColumn <= lastColumn
        ) {
          const classificationCell = sheet.getRange(
            classificationRow,
            classificationColumn
          );
          const normalizedValue = String(classificationCell.getValue() || "")
            .trim()
            .toUpperCase();
          if (classificationCell.getValue() !== normalizedValue) {
            classificationCell.setValue(normalizedValue);
          }
        }
      }
    }
  }

  const stockColumnsChanged = firstColumn <= 6 && lastColumn >= 6;

  if (stockColumnsChanged) {
    for (var stockRow = firstRow; stockRow <= lastRow; stockRow++) {
      const qty = safeNumber(sheet.getRange(stockRow, 6).getValue());
      sheet.getRange(stockRow, 7).setValue(qty);
    }
  }
}

function rowArrayToObject(row, sheetRow) {
  const obj = {};
  for (var i = 0; i < MASTER_HEADERS.length; i++) {
    obj[MASTER_HEADERS[i]] = row[i];
  }
  obj.No = safeNumber(sheetRow);
  return obj;
}

function parseRows(rows) {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1)
    .map(function (row, index) {
      return { row: row, sheetRow: index + 2 };
    })
    .filter(function (entry) {
      return entry.row.some(function (c) {
        return String(c).trim() !== "";
      });
    })
    .map(function (entry) {
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h] = entry.row[i];
      });
      obj.No = entry.sheetRow;
      return obj;
    });
}

function syncTotalQty(sheet) {
  const rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    const qty = safeNumber(rows[i][5]);
    const total = qty;

    if (safeNumber(rows[i][6]) !== total) {
      sheet.getRange(i + 1, 7).setValue(total);
    }
  }
}

function importExternalSheet(input) {
  const params = input || {};

  const sourceUrl = params.sourceUrl || EXTERNAL_SOURCE_URL_DEFAULT;
  const sourceId = params.sourceId || parseSpreadsheetId(sourceUrl);
  if (!sourceId) {
    return { status: "error", message: "Invalid sourceUrl/sourceId" };
  }

  const sourceSpreadsheet = SpreadsheetApp.openById(sourceId);
  const sourceSheetName = params.sourceSheet || "";
  const sourceGid =
    String(
      params.sourceGid ||
        parseGidFromUrl(sourceUrl) ||
        EXTERNAL_SOURCE_GID_DEFAULT
    ).trim();

  let sourceSheet = null;
  if (String(sourceSheetName).trim()) {
    sourceSheet = sourceSpreadsheet.getSheetByName(String(sourceSheetName).trim());
  }
  if (!sourceSheet && sourceGid) {
    sourceSheet = findSheetByGid(sourceSpreadsheet, sourceGid);
  }
  if (!sourceSheet) {
    sourceSheet = sourceSpreadsheet.getSheets()[0];
  }
  if (!sourceSheet) {
    return { status: "error", message: "Source sheet not found" };
  }

  const targetSheetName =
    params.targetSheet || params.sheet || EXTERNAL_TARGET_SHEET_DEFAULT;
  const targetSheet = getOrCreateSheet(targetSheetName);
  const mode = String(params.mode || "replace").toLowerCase();
  const values = sourceSheet.getDataRange().getValues();
  const rowCount = values.length;
  const colCount = rowCount > 0 ? values[0].length : 0;

  if (mode === "append") {
    if (rowCount > 0 && colCount > 0) {
      const startRow = Math.max(1, targetSheet.getLastRow() + 1);
      targetSheet.getRange(startRow, 1, rowCount, colCount).setValues(values);
    }
  } else {
    targetSheet.clearContents();
    if (rowCount > 0 && colCount > 0) {
      targetSheet.getRange(1, 1, rowCount, colCount).setValues(values);
    }
  }

  return {
    status: "success",
    action: "importExternal",
    sourceSpreadsheetId: sourceId,
    sourceSheet: sourceSheet.getName(),
    sourceGid: String(sourceSheet.getSheetId()),
    targetSheet: targetSheet.getName(),
    mode: mode === "append" ? "append" : "replace",
    rowCount: rowCount,
    columnCount: colCount,
  };
}

function normalizeToken(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function scoreRowForScan(row, refToken, lotToken) {
  const rowRef = normalizeToken(row.NoStok);
  const rowLot = normalizeToken(row.Batch);
  let score = 0;

  if (!rowRef || !refToken) return 0;

  if (rowRef === refToken) score += 100;
  else if (rowRef.indexOf(refToken) !== -1 || refToken.indexOf(rowRef) !== -1) score += 60;

  if (lotToken) {
    if (rowLot === lotToken) score += 40;
    else if (rowLot.indexOf(lotToken) !== -1 || lotToken.indexOf(rowLot) !== -1) score += 20;
  }

  return score;
}

function scanLookup(e) {
  const req = e || {};
  req.parameter = req.parameter || {};

  const sheetName = req.parameter.sheet || DEFAULT_SHEET;
  const refRaw = req.parameter.ref || "";
  const lotRaw = req.parameter.lot || "";
  const refToken = normalizeToken(refRaw);
  const lotToken = normalizeToken(lotRaw);

  if (!refToken) {
    return { status: "error", message: "Missing ref for scanLookup" };
  }

  const sheet = resolveDataSheet(req.parameter);
  normalizeSheet(sheet);
  syncTotalQty(sheet);

  const rows = parseRows(sheet.getDataRange().getValues());
  const ranked = rows
    .map(function (row) {
      return {
        row: row,
        _score: scoreRowForScan(row, refToken, lotToken),
      };
    })
    .filter(function (item) {
      return item._score > 0;
    })
    .sort(function (a, b) {
      return b._score - a._score;
    });

  return {
    status: "success",
    found: ranked.length > 0,
    best: ranked.length ? Object.assign({}, ranked[0].row, { _score: ranked[0]._score }) : null,
    data: ranked.slice(0, 20).map(function (item) {
      return Object.assign({}, item.row, { _score: item._score });
    }),
    query: { sheet: sheetName, ref: refRaw, lot: lotRaw },
  };
}

function generateKPI(sheetName, input) {
  const params = input || {};
  const sheet = resolveDataSheet(
    Object.assign({}, params, { sheet: sheetName || DEFAULT_SHEET })
  );
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return { totalItems: 0, lowStock: 0, sumStock: 0 };
  }

  let totalItems = 0;
  let lowStock = 0;
  let sumStock = 0;

  for (var i = 1; i < rows.length; i++) {
    const noStok = rows[i][0];
    const totalQty = safeNumber(rows[i][6]);

    if (String(noStok).trim()) totalItems++;
    sumStock += totalQty;
    if (totalQty <= LOW_STOCK_THRESHOLD) lowStock++;
  }

  return { totalItems: totalItems, lowStock: lowStock, sumStock: sumStock };
}

function logHistory(action, sheetName, no, beforeObj, afterObj, by) {
  try {
    const hist = getSheet("History");
    const actor = by || Session.getActiveUser().getEmail() || "";
    const before = beforeObj || {};
    const after = afterObj || {};

    const fields = {};
    Object.keys(before).forEach(function (k) {
      fields[k] = true;
    });
    Object.keys(after).forEach(function (k) {
      fields[k] = true;
    });

    const changes = [];
    Object.keys(fields).forEach(function (field) {
      const b = before[field];
      const a = after[field];
      if (String(b) !== String(a)) {
        changes.push({
          field: field,
          before: b === undefined ? "" : String(b),
          after: a === undefined ? "" : String(a),
        });
      }
    });

    if (changes.length === 0) return;

    hist.appendRow([
      new Date(),
      action,
      sheetName,
      safeNumber(no),
      JSON.stringify(changes),
      actor,
    ]);
  } catch (err) {
    Logger.log(err);
  }
}

function getHistory(e) {
  const req = e || {};
  req.parameter = req.parameter || {};

  const hist = getSheet("History");
  const rows = hist.getDataRange().getValues();

  if (rows.length < 2) return { status: "success", data: [] };

  const headers = rows[0];
  const idx = {
    Timestamp: headers.indexOf("Timestamp"),
    Action: headers.indexOf("Action"),
    Sheet: headers.indexOf("Sheet"),
    No: headers.indexOf("No"),
    Changes: headers.indexOf("Changes"),
    By: headers.indexOf("By"),
  };

  const targetSheet = req.parameter.sheet || "";
  const targetNo = safeNumber(req.parameter.No);

  const data = rows
    .slice(1)
    .filter(function (r) {
      if (targetSheet && r[idx.Sheet] !== targetSheet) return false;
      if (targetNo && safeNumber(r[idx.No]) !== targetNo) return false;
      return true;
    })
    .map(function (r) {
      return {
        Timestamp: r[idx.Timestamp],
        Action: r[idx.Action],
        Sheet: r[idx.Sheet],
        No: safeNumber(r[idx.No]),
        Changes: r[idx.Changes] || "[]",
        By: r[idx.By] || "",
      };
    })
    .reverse();

  return { status: "success", data: data };
}

function handleCreate(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  normalizeSheet(sheet);

  const row = [
    payload.NoStok || "",
    payload.Deskripsi || "",
    payload.Implant || "",
    payload.Brand || "",
    payload.Batch || "",
    safeNumber(payload.Qty),
    0,
    safeNumber(payload.TERPAKAI),
    safeNumber(payload.REFILL),
    payload.KET || "",
  ];

  row[6] = safeNumber(row[5]);
  sheet.appendRow(row);
  const no = sheet.getLastRow();

  upsertStockWarning(
    sheet.getName(),
    no,
    rowArrayToObject(row, no),
    payload.KET || "Data stok dibuat"
  );
  logHistory("CREATE", sheet.getName(), no, {}, rowArrayToObject(row, no), payload.by);
  return { status: "success", No: no };
}

function handleUpdate(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  normalizeSheet(sheet);

  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);
  const idx = no - 1;

  if (idx < 1 || idx >= rows.length) {
    return { status: "error", message: "Baris data tidak ditemukan" };
  }

  const beforeRow = rows[idx];
  const before = rowArrayToObject(beforeRow, no);

  const nextNoStok = hasOwn(payload, "NoStok") ? payload.NoStok : before.NoStok;
  const nextDesc = hasOwn(payload, "Deskripsi") ? payload.Deskripsi : before.Deskripsi;
  const nextImplant = hasOwn(payload, "Implant") ? payload.Implant : before.Implant;
  const nextBrand = hasOwn(payload, "Brand") ? payload.Brand : before.Brand;
  const nextBatch = hasOwn(payload, "Batch") ? payload.Batch : before.Batch;
  const nextQty = hasOwn(payload, "Qty") ? payload.Qty : before.Qty;
  const nextUsed = hasOwn(payload, "TERPAKAI") ? payload.TERPAKAI : before.TERPAKAI;
  const nextRefill = hasOwn(payload, "REFILL") ? payload.REFILL : before.REFILL;
  const nextKet = hasOwn(payload, "KET") ? payload.KET : before.KET;

  const updated = [
    nextNoStok || "",
    nextDesc || "",
    nextImplant || "",
    nextBrand || "",
    nextBatch || "",
    safeNumber(nextQty),
    0,
    safeNumber(nextUsed),
    safeNumber(nextRefill),
    nextKet || "",
  ];
  updated[6] = safeNumber(updated[5]);

  sheet.getRange(idx + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  const after = rowArrayToObject(updated, no);

  upsertStockWarning(sheet.getName(), no, after, nextKet || "Data stok diperbarui");
  logHistory("UPDATE", sheet.getName(), no, before, after, payload.by);
  return { status: "success" };
}

function handleDelete(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);
  const idx = no - 1;
  if (idx < 1 || idx >= rows.length) {
    return { status: "error", message: "Baris data tidak ditemukan" };
  }

  const before = rowArrayToObject(rows[idx], no);
  sheet.deleteRow(idx + 1);
  logHistory("DELETE", sheet.getName(), no, before, {}, payload.by);

  return { status: "success" };
}

function buildMovementDescription(reason, qty, note) {
  const labels = {
    REFILL: "Refill stok",
    OPERASI: "Terpakai untuk operasi",
    MOBILISASI_KELUAR: "Support keluar ke cabang",
    MOBILISASI_MASUK: "Kembali dari cabang",
  };
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm"
  );
  return (
    "[" +
    timestamp +
    "] " +
    (labels[reason] || reason) +
    " • " +
    qty +
    " unit" +
    (String(note || "").trim() ? " • " + String(note).trim() : "")
  );
}

function handleMutasi(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  normalizeSheet(sheet);

  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);
  const qty = safeNumber(payload.qty);

  if (qty <= 0) return { status: "error", message: "Qty harus > 0" };

  const idx = no - 1;
  if (idx < 1 || idx >= rows.length) {
    return { status: "error", message: "Baris data tidak ditemukan" };
  }

  const old = rows[idx];
  const before = rowArrayToObject(old, no);
  const type = String(payload.type || "").toLowerCase();
  const movementReason = String(
    payload.movementReason || (type === "in" ? "REFILL" : "OPERASI")
  ).toUpperCase();
  const movementNote = String(payload.note || "").trim();

  let currentQty = safeNumber(old[5]);
  let used = safeNumber(old[7]);
  let refill = safeNumber(old[8]);
  const allowedReasons =
    type === "in"
      ? ["REFILL", "MOBILISASI_MASUK"]
      : ["OPERASI", "MOBILISASI_KELUAR"];

  if (allowedReasons.indexOf(movementReason) < 0) {
    return { status: "error", message: "Alasan pergerakan tidak sesuai" };
  }
  if (!movementNote) {
    return { status: "error", message: "Keterangan pergerakan wajib diisi" };
  }

  if (type === "in") {
    currentQty += qty;
    if (movementReason === "REFILL") refill += qty;
  } else if (type === "out") {
    if (currentQty < qty) {
      return { status: "error", message: "Stock not enough" };
    }
    currentQty -= qty;
    if (movementReason === "OPERASI") used += qty;
  } else {
    return { status: "error", message: "Invalid mutasi type" };
  }

  const updated = old.slice();
  updated[5] = currentQty;
  updated[7] = used;
  updated[8] = refill;
  updated[6] = currentQty;
  const movementDescription = buildMovementDescription(
    movementReason,
    qty,
    movementNote
  );
  // Kolom KET hanya menyimpan aktivitas paling baru agar mudah dibaca.
  // Aktivitas sebelumnya tetap tersimpan lengkap di sheet History.
  updated[9] =
    currentQty <= 0 && type === "out"
      ? movementDescription + " • WARNING: STOK HABIS — SEGERA REFILL"
      : movementDescription;

  sheet.getRange(idx + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  upsertStockWarning(
    sheet.getName(),
    no,
    rowArrayToObject(updated, no),
    movementDescription
  );
  logHistory(
    movementReason,
    sheet.getName(),
    no,
    before,
    rowArrayToObject(updated, no),
    payload.by
  );

  return { status: "success", No: no, newQty: safeNumber(updated[6]) };
}

function handleDuplicate(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  const rows = sheet.getDataRange().getValues();
  const targetNo = safeNumber(payload.No);

  const idx = targetNo - 1;
  if (idx < 1 || idx >= rows.length) {
    return { status: "error", message: "Baris data tidak ditemukan" };
  }

  const source = rows[idx].slice();
  const newRow = source.slice();
  sheet.appendRow(newRow);
  const newNo = sheet.getLastRow();

  logHistory(
    "DUPLICATE",
    sheet.getName(),
    newNo,
    rowArrayToObject(source, targetNo),
    rowArrayToObject(newRow, newNo),
    payload.by
  );

  return { status: "success", No: newNo };
}

function autoBackupDaily() {
  if (!BACKUP_FOLDER_ID || BACKUP_FOLDER_ID === "YOUR_BACKUP_FOLDER_ID") {
    return "BACKUP_FOLDER_ID belum diisi";
  }

  const ss = getApplicationSpreadsheet();
  const file = DriveApp.getFileById(ss.getId());
  const folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMdd_HHmmss"
  );
  const copy = file.makeCopy("Backup_" + ss.getName() + "_" + timestamp, folder);
  return copy.getUrl();
}

function exportPdf(sheetName) {
  const ss = getApplicationSpreadsheet();
  const sheet = getSheet(sheetName || DEFAULT_SHEET);
  const gid = sheet.getSheetId();

  const url =
    ss.getUrl().replace(/edit$/, "") +
    "export?format=pdf" +
    "&size=A4" +
    "&portrait=true" +
    "&fitw=true" +
    "&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false" +
    "&fzr=true" +
    "&gid=" +
    gid;

  return { status: "success", url: url };
}

/* =====================================================
   CUSTOMER MAPPING / TARGET APPROVAL
===================================================== */
function normalizeCustomerValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCustomerEnum(value, allowed, fallback) {
  const normalized = normalizeCustomerValue(value).toUpperCase();
  return allowed.indexOf(normalized) >= 0 ? normalized : fallback;
}

function calculatePotentialPriority(monthlyCaseCount, orthopedicCaseTypes, fallback) {
  const count = safeNumber(monthlyCaseCount);
  const cases = normalizeCustomerValue(orthopedicCaseTypes).toLowerCase();
  const hasArthroplasty = cases.indexOf("artroplasty hip") >= 0 || cases.indexOf("artroplasty knee") >= 0;
  const hasTraumaOrScope = cases.indexOf("trauma") >= 0 || cases.indexOf("artroscopy") >= 0;
  if (count > 5 && hasArthroplasty) return "HIGH";
  if (hasTraumaOrScope || (count > 0 && hasArthroplasty)) return "MEDIUM";
  return normalizeCustomerEnum(fallback, ["HIGH", "MEDIUM", "LOW"], "LOW");
}

function customerKey(item) {
  return [item.CustomerType, item.Territory, item.Hospital, item.Doctor]
    .map(function (value) {
      return normalizeCustomerValue(value).toUpperCase();
    })
    .join("|");
}

function getCustomerSheet() {
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CUSTOMER_HEADERS.length).setValues([CUSTOMER_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CUSTOMER_HEADERS.length)
      .setBackground("#172554")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    return sheet;
  }

  const firstCustomerCell = String(sheet.getRange(1, 1).getValue() || "").trim();
  if (firstCustomerCell && firstCustomerCell !== CUSTOMER_HEADERS[0]) {
    sheet.insertRowsBefore(1, 1);
  }

  const headers = sheet
    .getRange(1, 1, 1, CUSTOMER_HEADERS.length)
    .getValues()[0];
  const existingHeaderCount = Math.min(sheet.getLastColumn(), CUSTOMER_HEADERS.length);
  const valid = CUSTOMER_HEADERS.slice(0, existingHeaderCount).every(function (header, index) {
    return headers[index] === header || headers[index] === "";
  });
  if (!valid) {
    throw new Error(
      "Header sheet " + CUSTOMER_SHEET + " tidak sesuai. Jangan ubah urutan header."
    );
  }
  sheet.getRange(1, 1, 1, CUSTOMER_HEADERS.length).setValues([CUSTOMER_HEADERS]);
  return sheet;
}

function getCustomerHistorySheet() {
  const sheet = getOrCreateSheet(CUSTOMER_HISTORY_SHEET);
  ensureHeaderRow(sheet, CUSTOMER_HISTORY_HEADERS);
  sheet
    .getRange(1, 1, 1, CUSTOMER_HISTORY_HEADERS.length)
    .setValues([CUSTOMER_HISTORY_HEADERS])
    .setBackground("#7c2d12")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  return sheet;
}

function getCustomerUsageSheet() {
  const sheet = getOrCreateSheet(CUSTOMER_USAGE_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CUSTOMER_USAGE_HEADERS.length).setValues([CUSTOMER_USAGE_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CUSTOMER_USAGE_HEADERS.length)
      .setBackground("#047857")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sheet.getRange("B:B").setNumberFormat("yyyy-mm-dd hh:mm:ss");
    return sheet;
  }
  ensureHeaderRow(sheet, CUSTOMER_USAGE_HEADERS);
  sheet.getRange(1, 1, 1, CUSTOMER_USAGE_HEADERS.length).setValues([CUSTOMER_USAGE_HEADERS]);
  return sheet;
}

function listCustomerUsage() {
  const sheet = getCustomerUsageSheet();
  const values = sheet.getDataRange().getValues();
  const data = values.slice(1).map(function (row) {
    const item = {};
    CUSTOMER_USAGE_HEADERS.forEach(function (header, index) { item[header] = row[index]; });
    return item;
  });
  return { status: "success", data: data, total: data.length, sheet: CUSTOMER_USAGE_SHEET };
}

function customerArrayToObject(row) {
  const item = {};
  CUSTOMER_HEADERS.forEach(function (header, index) {
    item[header] = row[index];
  });
  return item;
}

function customerObjectForClient(item) {
  return {
    id: normalizeCustomerValue(item.ID),
    customerType: normalizeCustomerEnum(item.CustomerType, ["EXISTING", "TARGET"], "TARGET"),
    territory: normalizeCustomerValue(item.Territory),
    hospital: normalizeCustomerValue(item.Hospital),
    doctor: normalizeCustomerValue(item.Doctor),
    note: normalizeCustomerValue(item.Note),
    plan: normalizeCustomerValue(item.Plan),
    priority: normalizeCustomerEnum(item.Priority, ["HIGH", "MEDIUM", "LOW"], "MEDIUM"),
    status: normalizeCustomerEnum(item.Status, ["NEW", "TARGETED", "APPROVED", "REJECTED"], "NEW"),
    owner: normalizeCustomerValue(item.Owner),
    approvedBy: normalizeCustomerValue(item.ApprovedBy),
    approvedAt: item.ApprovedAt || "",
    createdAt: item.CreatedAt || "",
    updatedAt: item.UpdatedAt || "",
    sourceFile: normalizeCustomerValue(item.SourceFile),
    sourceRow: safeNumber(item.SourceRow),
    journeyStage: normalizeCustomerEnum(item.JourneyStage, ["PROSPECT", "TARGETED", "OFFERED", "FIRST_USE", "REPEAT_USE"], "PROSPECT"),
    productOffered: normalizeCustomerValue(item.ProductOffered),
    offeredAt: item.OfferedAt || "",
    firstUsedAt: item.FirstUsedAt || "",
    lastUsedAt: item.LastUsedAt || "",
    usageCount: safeNumber(item.UsageCount),
    nextFollowUp: item.NextFollowUp || "",
    outcome: normalizeCustomerValue(item.Outcome),
    phone: normalizeCustomerValue(item.Phone),
    specialty: normalizeCustomerValue(item.Specialty),
    practiceHospital2: normalizeCustomerValue(item.PracticeHospital2),
    practiceHospital3: normalizeCustomerValue(item.PracticeHospital3),
    photoUrl: normalizeCustomerValue(item.PhotoUrl),
    photoFileId: normalizeCustomerValue(item.PhotoFileId),
    implantUsed: normalizeCustomerValue(item.ImplantUsed),
    procedureType: normalizeCustomerValue(item.ProcedureType),
    usageHospital: normalizeCustomerValue(item.UsageHospital),
    monthlyCaseCount: safeNumber(item.MonthlyCaseCount),
    orthopedicCaseTypes: normalizeCustomerValue(item.OrthopedicCaseTypes),
    implantVendors: normalizeCustomerValue(item.ImplantVendors),
    vendorSupport: normalizeCustomerValue(item.VendorSupport),
  };
}

function customerRowFromPayload(payload, previous) {
  const input = payload || {};
  const old = previous || {};
  const now = new Date();
  const customerType = normalizeCustomerEnum(
    input.customerType || old.CustomerType,
    ["EXISTING", "TARGET"],
    "TARGET"
  );
  const monthlyCaseCount = hasOwn(input, "monthlyCaseCount") ? safeNumber(input.monthlyCaseCount) : safeNumber(old.MonthlyCaseCount);
  const orthopedicCaseTypes = hasOwn(input, "orthopedicCaseTypes") ? normalizeCustomerValue(input.orthopedicCaseTypes) : normalizeCustomerValue(old.OrthopedicCaseTypes);
  const priority = customerType === "TARGET" && (monthlyCaseCount > 0 || orthopedicCaseTypes)
    ? calculatePotentialPriority(monthlyCaseCount, orthopedicCaseTypes, input.priority || old.Priority)
    : normalizeCustomerEnum(input.priority || old.Priority, ["HIGH", "MEDIUM", "LOW"], "MEDIUM");

  return [
    normalizeCustomerValue(old.ID || input.id) || Utilities.getUuid(),
    customerType,
    normalizeCustomerValue(input.territory || old.Territory),
    normalizeCustomerValue(input.hospital || old.Hospital),
    normalizeCustomerValue(input.doctor || old.Doctor),
    hasOwn(input, "note") ? normalizeCustomerValue(input.note) : normalizeCustomerValue(old.Note),
    hasOwn(input, "plan") ? normalizeCustomerValue(input.plan) : normalizeCustomerValue(old.Plan),
    priority,
    normalizeCustomerEnum(
      old.Status || input.status || (customerType === "EXISTING" ? "APPROVED" : "NEW"),
      ["NEW", "TARGETED", "APPROVED", "REJECTED"],
      customerType === "EXISTING" ? "APPROVED" : "NEW"
    ),
    normalizeCustomerValue(old.Owner),
    normalizeCustomerValue(old.ApprovedBy),
    old.ApprovedAt || "",
    old.CreatedAt || now,
    now,
    normalizeCustomerValue(input.sourceFile || old.SourceFile),
    safeNumber(input.sourceRow || old.SourceRow),
    normalizeCustomerEnum(input.journeyStage || old.JourneyStage, ["PROSPECT", "TARGETED", "OFFERED", "FIRST_USE", "REPEAT_USE"], "PROSPECT"),
    hasOwn(input, "productOffered") ? normalizeCustomerValue(input.productOffered) : normalizeCustomerValue(old.ProductOffered),
    old.OfferedAt || "",
    old.FirstUsedAt || "",
    old.LastUsedAt || "",
    safeNumber(old.UsageCount),
    hasOwn(input, "nextFollowUp") ? input.nextFollowUp || "" : old.NextFollowUp || "",
    hasOwn(input, "outcome") ? normalizeCustomerValue(input.outcome) : normalizeCustomerValue(old.Outcome),
    hasOwn(input, "phone") ? normalizeCustomerValue(input.phone) : normalizeCustomerValue(old.Phone),
    hasOwn(input, "specialty") ? normalizeCustomerValue(input.specialty) : normalizeCustomerValue(old.Specialty),
    hasOwn(input, "practiceHospital2") ? normalizeCustomerValue(input.practiceHospital2) : normalizeCustomerValue(old.PracticeHospital2),
    hasOwn(input, "practiceHospital3") ? normalizeCustomerValue(input.practiceHospital3) : normalizeCustomerValue(old.PracticeHospital3),
    hasOwn(input, "photoUrl") ? normalizeCustomerValue(input.photoUrl) : normalizeCustomerValue(old.PhotoUrl),
    hasOwn(input, "photoFileId") ? normalizeCustomerValue(input.photoFileId) : normalizeCustomerValue(old.PhotoFileId),
    hasOwn(input, "implantUsed") ? normalizeCustomerValue(input.implantUsed) : normalizeCustomerValue(old.ImplantUsed),
    hasOwn(input, "procedureType") ? normalizeCustomerValue(input.procedureType) : normalizeCustomerValue(old.ProcedureType),
    hasOwn(input, "usageHospital") ? normalizeCustomerValue(input.usageHospital) : normalizeCustomerValue(old.UsageHospital),
    monthlyCaseCount,
    orthopedicCaseTypes,
    hasOwn(input, "implantVendors") ? normalizeCustomerValue(input.implantVendors) : normalizeCustomerValue(old.ImplantVendors),
    hasOwn(input, "vendorSupport") ? normalizeCustomerValue(input.vendorSupport) : normalizeCustomerValue(old.VendorSupport),
  ];
}

function getDoctorPhotoFolder() {
  try {
    return DriveApp.getFolderById(DOCTOR_PHOTO_FOLDER_ID);
  } catch (error) {
    throw new Error(
      "Folder foto dokter tidak dapat diakses. Pastikan akun yang menjalankan Apps Script memiliki akses Editor ke folder Drive."
    );
  }
}

function saveDoctorPhoto(dataUrl, doctorName, previousFileId) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Data foto dokter tidak valid");
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Foto dokter maksimal 5 MB setelah dikompres");
  const safeName = normalizeCustomerValue(doctorName || "doctor").replace(/[^a-zA-Z0-9._-]+/g, "-");
  const extension = match[1] === "image/png" ? ".png" : ".jpg";
  const blob = Utilities.newBlob(bytes, match[1], safeName + "-" + Date.now() + extension);
  const file = getDoctorPhotoFolder().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    // Some Workspace domains manage sharing centrally; the file is still retained.
  }
  if (previousFileId) {
    try { DriveApp.getFileById(previousFileId).setTrashed(true); } catch (ignore) {}
  }
  return {
    fileId: file.getId(),
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200",
  };
}

function logCustomerHistory(id, action, before, after, by) {
  getCustomerHistorySheet().appendRow([
    new Date(),
    id,
    action,
    JSON.stringify(before || {}),
    JSON.stringify(after || {}),
    normalizeCustomerValue(by || Session.getActiveUser().getEmail()),
  ]);
}

function bulkImportCustomers(payload) {
  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) return { status: "error", message: "rows customer kosong" };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getCustomerSheet();
    const values = sheet.getDataRange().getValues();
    const existingByKey = {};
    for (var i = 1; i < values.length; i++) {
      const item = customerArrayToObject(values[i]);
      existingByKey[customerKey(item)] = { rowIndex: i + 1, item: item };
    }

    let inserted = 0;
    let updated = 0;
    const seen = {};
    rows.forEach(function (input) {
      if (!input || (!normalizeCustomerValue(input.hospital) && !normalizeCustomerValue(input.doctor))) {
        return;
      }

      const candidate = {
        CustomerType: input.customerType,
        Territory: input.territory,
        Hospital: input.hospital,
        Doctor: input.doctor,
      };
      const key = customerKey(candidate);
      if (seen[key]) return;
      seen[key] = true;

      const found = existingByKey[key];
      if (found) {
        const nextRow = customerRowFromPayload(input, found.item);
        sheet.getRange(found.rowIndex, 1, 1, CUSTOMER_HEADERS.length).setValues([nextRow]);
        const after = customerArrayToObject(nextRow);
        logCustomerHistory(after.ID, "IMPORT_UPDATE", found.item, after, payload.by);
        existingByKey[key] = { rowIndex: found.rowIndex, item: after };
        updated++;
      } else {
        const nextRow = customerRowFromPayload(input, null);
        sheet.appendRow(nextRow);
        const after = customerArrayToObject(nextRow);
        existingByKey[key] = { rowIndex: sheet.getLastRow(), item: after };
        logCustomerHistory(after.ID, "IMPORT_CREATE", {}, after, payload.by);
        inserted++;
      }
    });

    sheet.autoResizeColumns(1, CUSTOMER_HEADERS.length);
    return {
      status: "success",
      action: "customerBulkImport",
      inserted: inserted,
      updated: updated,
      total: inserted + updated,
      sheet: CUSTOMER_SHEET,
    };
  } finally {
    lock.releaseLock();
  }
}

function listCustomers(params) {
  const sheet = getCustomerSheet();
  const rows = sheet.getDataRange().getValues();
  const requestedStatus = normalizeCustomerValue(params && params.status).toUpperCase();
  const requestedType = normalizeCustomerValue(params && params.customerType).toUpperCase();
  const query = normalizeCustomerValue(params && params.q).toUpperCase();

  const data = rows.slice(1).map(customerArrayToObject).filter(function (item) {
    if (requestedStatus && item.Status !== requestedStatus) return false;
    if (requestedType && item.CustomerType !== requestedType) return false;
    if (query) {
      const haystack = [item.Doctor, item.Hospital, item.Territory, item.Owner, item.Note]
        .join(" ")
        .toUpperCase();
      if (haystack.indexOf(query) === -1) return false;
    }
    return normalizeCustomerValue(item.ID) !== "";
  }).map(customerObjectForClient);

  data.sort(function (a, b) {
    const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const aRank = hasOwn(priority, a.priority) ? priority[a.priority] : 1;
    const bRank = hasOwn(priority, b.priority) ? priority[b.priority] : 1;
    return aRank - bRank;
  });
  return { status: "success", data: data, total: data.length, sheet: CUSTOMER_SHEET };
}

function updateCustomerDecision(payload) {
  const id = normalizeCustomerValue(payload && payload.id);
  if (!id) return { status: "error", message: "Customer ID wajib diisi" };

  const nextStatus = normalizeCustomerEnum(
    payload.status,
    ["NEW", "TARGETED", "APPROVED", "REJECTED"],
    ""
  );
  if (!nextStatus) return { status: "error", message: "Status customer tidak valid" };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getCustomerSheet();
    const values = sheet.getDataRange().getValues();
    let index = -1;
    for (var i = 1; i < values.length; i++) {
      if (normalizeCustomerValue(values[i][0]) === id) {
        index = i;
        break;
      }
    }
    if (index < 1) return { status: "error", message: "Customer tidak ditemukan" };

    const before = customerArrayToObject(values[index]);
    const next = values[index].slice();
    const actor = normalizeCustomerValue(payload.by || Session.getActiveUser().getEmail());
    next[8] = nextStatus;
    if (hasOwn(payload, "owner")) next[9] = normalizeCustomerValue(payload.owner);
    if (hasOwn(payload, "note")) next[5] = normalizeCustomerValue(payload.note);
    next[13] = new Date();

    if (nextStatus === "TARGETED" || nextStatus === "APPROVED") {
      const missing = [];
      if (!normalizeCustomerValue(next[2])) missing.push("Territory");
      if (!normalizeCustomerValue(next[3])) missing.push("Hospital");
      if (!normalizeCustomerValue(next[4])) missing.push("Doctor");
      if (!normalizeCustomerValue(next[7])) missing.push("Priority");
      if (!normalizeCustomerValue(next[9])) missing.push("Owner / Sales PIC");
      if (next[1] === "TARGET" && !normalizeCustomerValue(next[6])) {
        missing.push("Planning / Follow-up");
      }
      if (missing.length) {
        return {
          status: "error",
          code: "CUSTOMER_INCOMPLETE",
          message: "Lengkapi data: " + missing.join(", "),
          missing: missing,
        };
      }
    }

    if (nextStatus === "APPROVED") {
      next[10] = actor;
      next[11] = new Date();
    } else {
      next[10] = "";
      next[11] = "";
    }

    sheet.getRange(index + 1, 1, 1, CUSTOMER_HEADERS.length).setValues([next]);
    const after = customerArrayToObject(next);
    logCustomerHistory(id, "STATUS_" + nextStatus, before, after, actor);
    return { status: "success", data: customerObjectForClient(after) };
  } finally {
    lock.releaseLock();
  }
}

function upsertCustomer(payload) {
  const input = payload || {};
  const id = normalizeCustomerValue(input.id);
  if (!normalizeCustomerValue(input.hospital) && !normalizeCustomerValue(input.doctor)) {
    return { status: "error", message: "Hospital atau dokter wajib diisi" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getCustomerSheet();
    const values = sheet.getDataRange().getValues();
    let index = -1;
    if (id) {
      for (var i = 1; i < values.length; i++) {
        if (normalizeCustomerValue(values[i][0]) === id) {
          index = i;
          break;
        }
      }
      if (index < 1) return { status: "error", message: "Customer tidak ditemukan" };
    }

    const before = index >= 1 ? customerArrayToObject(values[index]) : {};
    if (input.photoDataUrl) {
      const savedPhoto = saveDoctorPhoto(input.photoDataUrl, input.doctor || before.Doctor, before.PhotoFileId);
      input.photoUrl = savedPhoto.url;
      input.photoFileId = savedPhoto.fileId;
    } else if (index >= 1 && hasOwn(input, "photoFileId") && !normalizeCustomerValue(input.photoFileId) && before.PhotoFileId) {
      try { DriveApp.getFileById(before.PhotoFileId).setTrashed(true); } catch (ignore) {}
    }
    const next = customerRowFromPayload(input, index >= 1 ? before : null);
    next[8] = normalizeCustomerEnum(
      input.status || (index >= 1 ? before.Status : "NEW"),
      ["NEW", "TARGETED", "APPROVED", "REJECTED"],
      "NEW"
    );
    next[9] = normalizeCustomerValue(input.owner || (index >= 1 ? before.Owner : ""));

    const actor = normalizeCustomerValue(input.by || Session.getActiveUser().getEmail());
    if (next[8] === "APPROVED") {
      next[10] = actor;
      next[11] = index >= 1 && before.ApprovedAt ? before.ApprovedAt : new Date();
    } else {
      next[10] = "";
      next[11] = "";
    }

    if (index >= 1) {
      sheet.getRange(index + 1, 1, 1, CUSTOMER_HEADERS.length).setValues([next]);
    } else {
      sheet.appendRow(next);
    }

    const after = customerArrayToObject(next);
    logCustomerHistory(
      after.ID,
      index >= 1 ? "MANUAL_UPDATE" : "MANUAL_CREATE",
      before,
      after,
      actor
    );
    return {
      status: "success",
      action: index >= 1 ? "update" : "create",
      data: customerObjectForClient(after),
    };
  } finally {
    lock.releaseLock();
  }
}

function deleteCustomer(payload) {
  const id = normalizeCustomerValue(payload && payload.id);
  if (!id) return { status: "error", message: "Customer ID wajib diisi" };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getCustomerSheet();
    const values = sheet.getDataRange().getValues();
    let index = -1;
    for (var i = 1; i < values.length; i++) {
      if (normalizeCustomerValue(values[i][0]) === id) {
        index = i;
        break;
      }
    }
    if (index < 1) return { status: "error", message: "Customer tidak ditemukan" };

    const before = customerArrayToObject(values[index]);
    const actor = normalizeCustomerValue(payload.by || Session.getActiveUser().getEmail());
    sheet.deleteRow(index + 1);
    logCustomerHistory(id, "MANUAL_DELETE", before, {}, actor);
    return { status: "success", id: id };
  } finally {
    lock.releaseLock();
  }
}

function advanceCustomerJourney(payload) {
  const id = normalizeCustomerValue(payload && payload.id);
  const nextStage = normalizeCustomerEnum(
    payload && payload.journeyStage,
    ["PROSPECT", "TARGETED", "OFFERED", "FIRST_USE", "REPEAT_USE"],
    ""
  );
  if (!id || !nextStage) return { status: "error", message: "ID dan journey stage wajib diisi" };

  const stageOrder = { PROSPECT: 0, TARGETED: 1, OFFERED: 2, FIRST_USE: 3, REPEAT_USE: 4 };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getCustomerSheet();
    const values = sheet.getDataRange().getValues();
    let index = -1;
    for (var i = 1; i < values.length; i++) {
      if (normalizeCustomerValue(values[i][0]) === id) {
        index = i;
        break;
      }
    }
    if (index < 1) return { status: "error", message: "Customer tidak ditemukan" };

    const before = customerArrayToObject(values[index]);
    const currentStage = normalizeCustomerEnum(before.JourneyStage, ["PROSPECT", "TARGETED", "OFFERED", "FIRST_USE", "REPEAT_USE"], "PROSPECT");
    if (stageOrder[nextStage] > stageOrder[currentStage] + 1) {
      return { status: "error", message: "Tahap journey harus dijalankan berurutan" };
    }

    const owner = normalizeCustomerValue(payload.owner || before.Owner);
    const product = normalizeCustomerValue(payload.productOffered || before.ProductOffered);
    const note = hasOwn(payload, "note") ? normalizeCustomerValue(payload.note) : normalizeCustomerValue(before.Note);
    const plan = hasOwn(payload, "plan") ? normalizeCustomerValue(payload.plan) : normalizeCustomerValue(before.Plan);
    const outcome = hasOwn(payload, "outcome") ? normalizeCustomerValue(payload.outcome) : normalizeCustomerValue(before.Outcome);
    const usageHospital = normalizeCustomerValue(payload.usageHospital || before.UsageHospital || before.Hospital);
    const implantUsed = normalizeCustomerValue(payload.implantUsed || before.ImplantUsed || product);
    const procedureType = normalizeCustomerValue(payload.procedureType || before.ProcedureType);
    const monthlyCaseCount = hasOwn(payload, "monthlyCaseCount") ? safeNumber(payload.monthlyCaseCount) : safeNumber(before.MonthlyCaseCount);
    const orthopedicCaseTypes = hasOwn(payload, "orthopedicCaseTypes") ? normalizeCustomerValue(payload.orthopedicCaseTypes) : normalizeCustomerValue(before.OrthopedicCaseTypes);
    const implantVendors = hasOwn(payload, "implantVendors") ? normalizeCustomerValue(payload.implantVendors) : normalizeCustomerValue(before.ImplantVendors);
    const vendorSupport = hasOwn(payload, "vendorSupport") ? normalizeCustomerValue(payload.vendorSupport) : normalizeCustomerValue(before.VendorSupport);
    const missing = [];
    if (!normalizeCustomerValue(before.Territory)) missing.push("Territory");
    if (!normalizeCustomerValue(before.Hospital)) missing.push("Hospital");
    if (!normalizeCustomerValue(before.Doctor)) missing.push("Doctor");
    if (!owner) missing.push("Owner / Sales PIC");
    if (stageOrder[nextStage] >= stageOrder.OFFERED && !product) missing.push("Product Offered");
    if (stageOrder[nextStage] >= stageOrder.TARGETED && !plan) missing.push("Planning");
    if (nextStage === "TARGETED" && monthlyCaseCount <= 0) missing.push("Jumlah case per bulan");
    if (nextStage === "TARGETED" && !orthopedicCaseTypes) missing.push("Jenis case orthopedi");
    if (nextStage === "TARGETED" && !implantVendors) missing.push("Vendor implant");
    if (nextStage === "TARGETED" && !vendorSupport) missing.push("Support vendor");
    if (stageOrder[nextStage] >= stageOrder.FIRST_USE && !usageHospital) missing.push("Rumah sakit tindakan");
    if (stageOrder[nextStage] >= stageOrder.FIRST_USE && !implantUsed) missing.push("Implant yang digunakan");
    if (stageOrder[nextStage] >= stageOrder.FIRST_USE && !procedureType) missing.push("Jenis tindakan");
    if (missing.length) {
      return { status: "error", code: "CUSTOMER_INCOMPLETE", message: "Lengkapi data: " + missing.join(", "), missing: missing };
    }

    const next = values[index].slice();
    while (next.length < CUSTOMER_HEADERS.length) next.push("");
    const now = new Date();
    next[9] = owner;
    next[5] = note;
    next[6] = plan;
    if (hasOwn(payload, "hospital")) next[3] = normalizeCustomerValue(payload.hospital);
    if (hasOwn(payload, "practiceHospital2")) next[26] = normalizeCustomerValue(payload.practiceHospital2);
    if (hasOwn(payload, "practiceHospital3")) next[27] = normalizeCustomerValue(payload.practiceHospital3);
    next[13] = now;
    next[16] = nextStage;
    next[17] = product;
    if (nextStage === "TARGETED") next[8] = "TARGETED";
    if (nextStage === "OFFERED") next[18] = before.OfferedAt || now;
    if (nextStage === "FIRST_USE") {
      next[19] = before.FirstUsedAt || now;
      next[20] = now;
      next[21] = Math.max(1, safeNumber(before.UsageCount));
    }
    if (nextStage === "REPEAT_USE") {
      next[19] = before.FirstUsedAt || now;
      next[20] = now;
      next[21] = Math.max(2, safeNumber(before.UsageCount) + 1);
    }
    if (hasOwn(payload, "nextFollowUp")) next[22] = payload.nextFollowUp || "";
    if (hasOwn(payload, "outcome")) next[23] = outcome;
    if (stageOrder[nextStage] >= stageOrder.FIRST_USE) {
      next[30] = implantUsed;
      next[31] = procedureType;
      next[32] = usageHospital;
    }
    next[33] = monthlyCaseCount;
    next[34] = orthopedicCaseTypes;
    next[35] = implantVendors;
    next[36] = vendorSupport;
    if (nextStage === "TARGETED") {
      next[7] = calculatePotentialPriority(monthlyCaseCount, orthopedicCaseTypes, before.Priority);
    }

    sheet.getRange(index + 1, 1, 1, CUSTOMER_HEADERS.length).setValues([next]);
    const after = customerArrayToObject(next);
    const actor = normalizeCustomerValue(payload.by || Session.getActiveUser().getEmail());
    if (nextStage === "FIRST_USE" || nextStage === "REPEAT_USE") {
      const usageSheet = getCustomerUsageSheet();
      usageSheet.appendRow([
        Utilities.getUuid(),
        now,
        id,
        normalizeCustomerValue(after.Doctor),
        normalizeCustomerValue(after.CustomerType),
        normalizeCustomerValue(after.Territory),
        usageHospital,
        implantUsed,
        procedureType,
        nextStage === "FIRST_USE" ? "FIRST_USE" : "REPEAT_USE",
        safeNumber(after.UsageCount),
        product,
        note,
        plan,
        outcome,
        owner,
        actor,
      ]);
      usageSheet.autoResizeColumns(1, CUSTOMER_USAGE_HEADERS.length);
    }
    logCustomerHistory(id, "JOURNEY_" + nextStage, before, after, actor);
    return { status: "success", data: customerObjectForClient(after) };
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const req = e || {};
    req.parameter = req.parameter || {};

    const sheetName = req.parameter.sheet || DEFAULT_SHEET;
    const action = req.parameter.action || "";

    if (action === "capabilities") {
      return cors({
        status: "success",
        application: "NEX Stock Implant",
        version: APP_VERSION,
        modules: {
          stock: [
            "list",
            "create",
            "update",
            "delete",
            "mutasi",
            "duplicate",
            "history",
            "scanLookup",
            "kpi",
            "setupSheet",
          ],
          externalSheet: ["importExternal"],
          reporting: ["backup", "pdf"],
          customerMapping: [
            "customerList",
            "customerBulkImport",
            "customerDecision",
            "customerUpsert",
            "customerDelete",
            "customerJourney",
            "customerUsageList",
          ],
        },
      });
    }
    if (action === "history") return cors(getHistory(req));
    if (action === "setupSheet") return cors(setupApplicationSheets());
    if (action === "syncWarnings") return cors(syncStockWarnings());
    if (action === "warningList") return cors(listStockWarnings(req.parameter));
    if (action === "handoverList") return cors(listHandovers(req.parameter));
    if (action === "customerCapabilities") {
      return cors({
        status: "success",
        module: "CustomerMapping",
        version: APP_VERSION,
        actions: ["customerList", "customerBulkImport", "customerDecision", "customerUpsert", "customerDelete", "customerJourney", "customerUsageList"],
      });
    }
    if (action === "customerList") return cors(listCustomers(req.parameter));
    if (action === "customerUsageList") return cors(listCustomerUsage());
    if (action === "scanLookup") return cors(scanLookup(req));
    if (action === "importExternal") return cors(importExternalSheet(req.parameter));
    if (action === "kpi") {
      return cors({
        status: "success",
        kpi: generateKPI(sheetName, req.parameter),
      });
    }
    if (action === "backup") return cors({ status: "success", backupUrl: autoBackupDaily() });
    if (action === "pdf") return cors(exportPdf(sheetName));

    const sheet = resolveDataSheet(req.parameter);
    normalizeSheet(sheet);
    syncTotalQty(sheet);

    const rows = sheet.getDataRange().getValues();
    return cors({
      status: "success",
      sheet: sheetName,
      data: parseRows(rows),
    });
  } catch (err) {
    return cors({ status: "error", message: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.action === "setupSheet") return cors(setupApplicationSheets());
    if (payload.action === "importExternal") return cors(importExternalSheet(payload));
    if (payload.action === "customerBulkImport") return cors(bulkImportCustomers(payload));
    if (payload.action === "customerDecision") return cors(updateCustomerDecision(payload));
    if (payload.action === "customerUpsert") return cors(upsertCustomer(payload));
    if (payload.action === "customerDelete") return cors(deleteCustomer(payload));
    if (payload.action === "customerJourney") return cors(advanceCustomerJourney(payload));
    if (payload.action === "warningUpdate") return cors(updateStockWarningWorkflow(payload));
    if (payload.action === "handoverSave") return cors(saveHandover(payload));
    if (payload.action === "handoverAccept") return cors(acceptHandover(payload));
    if (payload.action === "handoverSettle") {
      return cors(settleHandoverInventory(payload));
    }
    if (payload.methodOverride === "PUT") return cors(handleUpdate(payload));
    if (payload.methodOverride === "DELETE") return cors(handleDelete(payload));
    if (payload.action === "mutasi") return cors(handleMutasi(payload));
    if (payload.action === "duplicate") return cors(handleDuplicate(payload));

    return cors(handleCreate(payload));
  } catch (err) {
    return cors({ status: "error", message: err.message });
  }
}
