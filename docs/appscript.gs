// Satu Apps Script untuk Stock Implant, External Sheet, History, KPI,
// Scanner, Backup/PDF, dan Customer Mapping.
const APP_VERSION = 53;
const DEFAULT_SHEET = "Sheet1";
const LOW_STOCK_THRESHOLD = 1;
const STOCK_WARNING_SHEET = "StockWarnings";
const HANDOVER_SHEET = "OnlineHandover";
const BRANCH_TRANSFER_SHEET = "BranchTransfers";
const INVENTORY_LOCATION_SHEET = "InventoryLocations";
const INVENTORY_LEDGER_SHEET = "InventoryLedger";
const INVENTORY_LOCATION_HEADERS = [
  "Location", "StockSheet", "StockRow", "NoStok", "Batch", "Description",
  "Brand", "Implant", "Qty", "Condition", "UpdatedAt", "UpdatedBy"
];
const INVENTORY_LEDGER_HEADERS = [
  "TransactionID", "Timestamp", "Action", "FromLocation", "ToLocation",
  "StockSheet", "StockRow", "NoStok", "Batch", "Qty", "Condition",
  "ReferenceType", "ReferenceID", "Note", "By"
];
const BARCODE_ALIAS_SHEET = "BarcodeAliases";
const BARCODE_ALIAS_HEADERS = [
  "RawCode", "Ref", "Lot", "Brand", "Implant", "Description",
  "StockSheet", "CreatedAt", "UpdatedAt", "By"
];
const STOCK_SPREADSHEET_ID =
  "1vGg0gPbaedxuVbvQhXy4oh9sX34RYHF-B3SJySuORkw";
const STOCK_SHEET_GID = "136121031";
const IMPLANT_OPTIONS = [
  "TKR",
  "UKA",
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
const MONTHLY_BACKUP_HANDLER = "autoBackupMonthly";
const BACKUP_LOG_SHEET = "BackupLog";
const BACKUP_LOG_HEADERS = [
  "CreatedAt",
  "Period",
  "FileName",
  "FileId",
  "BackupUrl",
  "Status",
  "Source",
];
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
  "SenderSignatureMetaJson",
  "ReceiverSignatureMetaJson",
  "VerificationToken",
  "BearingOption",
  "PhotoUrl",
  "PhotoFileId",
  "OperationDate",
  "OperationTime",
  "ProcedureCompletedAt",
  "CompletionNote",
];
const BRANCH_TRANSFER_HEADERS = [
  "ID",
  "CreatedAt",
  "UpdatedAt",
  "Status",
  "Origin",
  "Destination",
  "ItemsJson",
  "Note",
  "Sender",
  "Receiver",
  "PhotoUrl",
  "PhotoFileId",
  "SentAt",
  "ReceivedAt",
  "By",
  "TransferType",
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
  "Discontinue",
  "SupplySource",
];
const INSTRUMENT_MASTER_SHEET = "InstrumentMaster";
const INSTRUMENT_MASTER_HEADERS = [
  "Code",
  "Name",
  "Qty",
  "Uom",
  "Condition",
  "Procedure",
  "Brand",
  "SupplySource",
  "UpdatedAt",
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

function safeBoolean(value) {
  if (value === true || value === 1) return true;
  const normalized = String(value || "").trim().toUpperCase();
  return ["TRUE", "YA", "YES", "1", "DISCONTINUE", "DISCONTINUED"].indexOf(normalized) >= 0;
}

function normalizeSupplySource(value) {
  return String(value || "OFFICE").trim().toUpperCase() === "SUPPORT PUSAT"
    ? "SUPPORT PUSAT"
    : "OFFICE";
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
  const branchTransferSheet = ensureBranchTransferSheet();
  const inventorySheets = ensureInventoryLocationSheets();
  const barcodeAliasSheet = ensureBarcodeAliasSheet();
  const instrumentMasterSheet = getOrCreateSheet(INSTRUMENT_MASTER_SHEET);
  ensureHeaderRow(instrumentMasterSheet, INSTRUMENT_MASTER_HEADERS);
  instrumentMasterSheet
    .getRange(1, 1, 1, INSTRUMENT_MASTER_HEADERS.length)
    .setValues([INSTRUMENT_MASTER_HEADERS])
    .setBackground("#4c1d95")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  instrumentMasterSheet.setFrozenRows(1);
  instrumentMasterSheet.getRange("I:I").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  const backupLogSheet = getOrCreateSheet(BACKUP_LOG_SHEET);
  ensureHeaderRow(backupLogSheet, BACKUP_LOG_HEADERS);
  backupLogSheet
    .getRange(1, 1, 1, BACKUP_LOG_HEADERS.length)
    .setValues([BACKUP_LOG_HEADERS])
    .setBackground("#1d4ed8")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  backupLogSheet.setFrozenRows(1);
  backupLogSheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  migrateDiscontinuedWarningsToStock();
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
      branchTransferSheet.getName(),
      inventorySheets.locationSheet.getName(),
      inventorySheets.ledgerSheet.getName(),
      barcodeAliasSheet.getName(),
      backupLogSheet.getName(),
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
      try {
        item.SenderSignatureMeta = JSON.parse(
          String(item.SenderSignatureMetaJson || "{}")
        );
      } catch (err) {
        item.SenderSignatureMeta = {};
      }
      try {
        item.ReceiverSignatureMeta = JSON.parse(
          String(item.ReceiverSignatureMetaJson || "{}")
        );
      } catch (err) {
        item.ReceiverSignatureMeta = {};
      }
      delete item.ItemsJson;
      delete item.InstrumentsJson;
      delete item.SenderSignatureMetaJson;
      delete item.ReceiverSignatureMetaJson;
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

function getPublicHandover(params) {
  const id = String((params && params.id) || "").trim();
  const token = String((params && params.token) || "").trim();
  if (!id || !token) return { status: "error", message: "Link verifikasi tidak lengkap" };
  const document = listHandovers({ id: id }).data[0];
  if (!document || String(document.VerificationToken || "") !== token) {
    return { status: "error", message: "Dokumen atau token verifikasi tidak valid" };
  }
  delete document.By;
  delete document.PhotoFileId;
  delete document.VerificationToken;
  return { status: "success", data: [document] };
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

function buildHistoryBatchItem(entry) {
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
  return {
    action: entry.action,
    sheet: entry.sheetName || DEFAULT_SHEET,
    no: safeNumber(entry.no),
    changes: changes,
    by: entry.by || Session.getActiveUser().getEmail() || "",
  };
}

function appendHistoryBatch(entries) {
  const items = (entries || [])
    .map(buildHistoryBatchItem)
    .filter(function (item) {
      return Boolean(item);
    });
  if (!items.length) return;

  // Satu transaksi hanya memakai satu baris fisik di Google Sheet. Seluruh
  // perubahan item disimpan sebagai JSON dan diuraikan kembali oleh getHistory.
  const actions = items
    .map(function (item) {
      return String(item.action || "");
    })
    .filter(function (action, index, values) {
      return action && values.indexOf(action) === index;
    });
  const actors = items
    .map(function (item) {
      return String(item.by || "");
    })
    .filter(function (actor, index, values) {
      return actor && values.indexOf(actor) === index;
    });
  const sheets = items
    .map(function (item) {
      return String(item.sheet || DEFAULT_SHEET);
    })
    .filter(function (name, index, values) {
      return values.indexOf(name) === index;
    });
  const payload = {
    version: 2,
    type: "stock_history_batch",
    transactionId:
      "HIST-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000),
    itemCount: items.length,
    items: items,
  };
  const sheet = getSheet("History");
  sheet.appendRow([
    new Date(),
    actions.length === 1 ? actions[0] : "TRANSAKSI_STOCK",
    sheets.length === 1 ? sheets[0] : DEFAULT_SHEET,
    items.length === 1 ? items[0].no : 0,
    JSON.stringify(payload),
    actors.join(", "),
  ]);
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
    const supportPusat =
      normalizeSupplySource(stockRow.SupplySource) === "SUPPORT PUSAT";
    const isWarning = remaining <= LOW_STOCK_THRESHOLD;
    if ((!isWarning || supportPusat) && targetIndex < 0) return;
    const now = new Date();
    const wasResolved = String(existing[1] || "") === "SELESAI";
    const workflowStatus = isWarning && !supportPusat
      ? wasResolved || !existing[13]
        ? "BELUM DIPROSES"
        : existing[13]
      : "SELESAI";
    const values = [
      now,
      isWarning && !supportPusat ? (remaining <= 0 ? "HABIS" : "AKAN HABIS") : "SELESAI",
      entry.sheetName || DEFAULT_SHEET,
      safeNumber(entry.no),
      stockRow.NoStok || "",
      stockRow.Deskripsi || "",
      stockRow.Implant || "",
      stockRow.Brand || "",
      stockRow.Batch || "",
      remaining,
      supportPusat
        ? "Item tersedia melalui Support Pusat dan bukan stok fisik office."
        : isWarning
        ? remaining <= 0
          ? "WARNING: Implant sudah habis dan tidak tersedia lagi. Segera lakukan refill."
          : "WARNING: Sisa 1. Jika digunakan lagi implant akan habis dan tidak tersedia."
        : "Stok sudah tersedia kembali.",
      entry.lastMovement || stockRow.KET || "",
      isWarning && !supportPusat ? "" : now,
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
    if (normalizeSupplySource(item.supplySource) !== "SUPPORT PUSAT") {
      requiredByRow[rowNumber] = safeNumber(requiredByRow[rowNumber]) + qty;
    }
  });

  Object.keys(requiredByRow).forEach(function (rowKey) {
    const rowNumber = safeNumber(rowKey);
    const available = safeNumber(stockRows[rowNumber - 1][6]);
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
    const supplySource = normalizeSupplySource(item.supplySource);
    const officeBefore = rowNumber
      ? safeNumber(stockRows[rowNumber - 1][6])
      : 0;
    if (qty > 0) {
      const stockIndex = rowNumber - 1;
      const before = rowArrayToObject(stockRows[stockIndex], rowNumber);
      const updated = stockRows[stockIndex].slice();
      if (supplySource !== "SUPPORT PUSAT") {
        updated[5] = safeNumber(updated[6]) - qty;
        updated[6] = updated[5];
      }
      updated[9] = buildMovementDescription(
        "SERAH_TERIMA_RS",
        qty,
        (supplySource === "SUPPORT PUSAT" ? "SUPPORT PUSAT • " : "") +
          "REF: " + String(item.partNumber || before.NoStok || "-") +
          " • LOT: " + String(item.batch || before.Batch || "-") +
          " • " +
          "RS: " + String(payload.Hospital || "-") +
          " • Dokter: " + String(payload.Surgeon || "-") +
          " • Tindakan: " + String(payload.Procedure || "-") +
          " • Tanggal: " + String(payload.HandoverDate || "-")
      );
      stockRows[stockIndex] = updated;
      const after = rowArrayToObject(updated, rowNumber);
      historyEntries.push({
        action: "SERAH_TERIMA_RS",
        no: rowNumber,
        before: before,
        after: after,
        by: payload.by || payload.Sender || "Serah Terima Online",
      });
      if (supplySource !== "SUPPORT PUSAT") {
        warningEntries.push({
          no: rowNumber,
          stockRow: after,
          lastMovement: updated[9],
        });
      }
    }
    return Object.assign({}, item, {
      stockRow: rowNumber,
      officeBefore: officeBefore,
      officeAfter:
        supplySource === "SUPPORT PUSAT"
          ? officeBefore
          : Math.max(0, officeBefore - qty),
      supplySource: supplySource,
      qtyIssued: qty,
      hospitalQty: qty,
      usedQty: Math.max(0, safeNumber(item.usedQty)),
      returnedQty: Math.max(0, safeNumber(item.returnedQty)),
      locationStatus:
        qty > 0
          ? supplySource === "SUPPORT PUSAT"
            ? "SUPPORT PUSAT → RUMAH SAKIT"
            : "DI RUMAH SAKIT"
          : "TIDAK DIKIRIM",
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

function saveHandoverPhoto(dataUrl, handoverId, previousFileId) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { url: "", fileId: "" };
  const extension = match[1].indexOf("png") >= 0 ? "png" : "jpg";
  const blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    match[1],
    "serah-terima-" + handoverId + "." + extension
  );
  const file = DriveApp.getFolderById(BACKUP_FOLDER_ID).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  if (previousFileId) {
    try { DriveApp.getFileById(previousFileId).setTrashed(true); } catch (ignore) {}
  }
  return {
    url: "https://drive.google.com/uc?export=view&id=" + file.getId(),
    fileId: file.getId(),
  };
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
  const previousStatus = String(previous[17] || "").toUpperCase();
  const requestedStatus = String(payload.Status || "DRAFT").toUpperCase();
  let status = ["DRAFT", "DIKIRIM", "DITERIMA"].indexOf(requestedStatus) >= 0
    ? requestedStatus
    : "DRAFT";
  // Status dan tanda tangan bersifat maju-saja. Dokumen yang sudah dikirim
  // tidak boleh kembali menjadi draft, dan dokumen selesai tidak dapat dibuka
  // kembali melalui request yang dimanipulasi.
  if (previousStatus === "DIKIRIM" && status === "DRAFT") {
    status = "DIKIRIM";
  }
  if (previousStatus === "DITERIMA") {
    status = "DITERIMA";
  }
  let inventoryPostedAt = previous[24] || "";
  let photoUrl = String(payload.PhotoUrl || previous[30] || "");
  let photoFileId = String(payload.PhotoFileId || previous[31] || "");
  if (payload.PhotoDataUrl && previousStatus !== "DITERIMA") {
    const savedPhoto = saveHandoverPhoto(payload.PhotoDataUrl, id, photoFileId);
    photoUrl = savedPhoto.url;
    photoFileId = savedPhoto.fileId;
  }
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
    previousStatus === "DIKIRIM" || previousStatus === "DITERIMA"
      ? previous[22] || ""
      : payload.SenderSignature || previous[22] || "",
    previousStatus === "DITERIMA"
      ? previous[23] || ""
      : payload.ReceiverSignature || previous[23] || "",
    inventoryPostedAt,
    payload.HospitalUpdatedAt || previous[25] || "",
    previousStatus === "DIKIRIM" || previousStatus === "DITERIMA"
      ? previous[26] || "{}"
      : JSON.stringify(payload.SenderSignatureMeta || {}),
    previousStatus === "DITERIMA"
      ? previous[27] || "{}"
      : JSON.stringify(payload.ReceiverSignatureMeta || {}),
    payload.VerificationToken || previous[28] || "",
    payload.BearingOption || previous[29] || "",
    photoUrl,
    photoFileId,
    payload.OperationDate || previous[32] || payload.HandoverDate || "",
    payload.OperationTime || previous[33] || "",
    payload.ProcedureCompletedAt || previous[34] || "",
    payload.CompletionNote || previous[35] || "",
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
  if (!payload.VerificationToken || String(payload.VerificationToken) !== String(current.VerificationToken || "")) {
    return { status: "error", message: "Token penerimaan tidak valid" };
  }
  if (!String(payload.Receiver || "").trim()) {
    return { status: "error", message: "Nama penerima wajib diisi" };
  }
  current.Status = "DITERIMA";
  current.Receiver = payload.Receiver;
  current.AcceptanceNote = payload.AcceptanceNote || "";
  current.ReceiverSignature =
    payload.ReceiverSignature || current.ReceiverSignature || "";
  current.ReceiverSignatureMeta =
    payload.ReceiverSignatureMeta || current.ReceiverSignatureMeta || {};
  current.SenderSignatureMeta =
    payload.SenderSignatureMeta || current.SenderSignatureMeta || {};
  current.VerificationToken =
    payload.VerificationToken || current.VerificationToken || "";
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

function handoverItemMergeKey(item) {
  const stockRow = safeNumber(item && item.stockRow);
  if (stockRow > 0) return "ROW:" + stockRow;
  return [
    "ITEM",
    String((item && item.partNumber) || "").trim(),
    String((item && item.batch) || "").trim(),
  ].join(":");
}

function appendHandoverSupplement(payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { status: "error", message: "Kiriman tambahan sedang diproses" };
  }
  try {
    const id = String(payload.ID || "").trim();
    if (!id) throw new Error("ID dokumen serah terima wajib diisi");
    const current = listHandovers({ id: id }).data[0];
    if (!current) throw new Error("Dokumen serah terima tidak ditemukan");
    if (["DIKIRIM", "DITERIMA"].indexOf(String(current.Status)) < 0) {
      throw new Error("Kiriman tambahan hanya untuk dokumen yang sudah dikirim");
    }
    const requestId = String(payload.requestId || "").trim();
    if (!requestId) throw new Error("Kode transaksi kiriman tambahan tidak tersedia");
    const alreadyProcessed = (Array.isArray(current.Items) ? current.Items : [])
      .concat(Array.isArray(current.Instruments) ? current.Instruments : [])
      .some(function (item) {
        return (
          Array.isArray(item.supplementRequestIds) &&
          item.supplementRequestIds.indexOf(requestId) >= 0
        );
      });
    if (alreadyProcessed) {
      return { status: "success", ID: current.ID, data: current };
    }

    const requestedItems = (Array.isArray(payload.Items) ? payload.Items : [])
      .filter(function (item) {
        return item.selected && safeNumber(item.qtyIssued) > 0;
      });
    const requestedInstruments = (Array.isArray(payload.Instruments)
      ? payload.Instruments
      : []
    ).filter(function (item) {
      return item.selected && safeNumber(item.qty) > 0;
    });
    if (!requestedItems.length && !requestedInstruments.length) {
      throw new Error("Pilih minimal satu implant atau instrument tambahan");
    }

    const preparedSupplement = requestedItems.length
      ? dispatchHandoverInventory({
          ID: current.ID,
          Hospital: current.Hospital,
          Sender: payload.by || current.Sender || "Logistik",
          by: payload.by || current.Sender || "Logistik",
          Items: requestedItems,
        })
      : [];
    const mergedItems = (Array.isArray(current.Items) ? current.Items : []).map(
      function (item) {
        return Object.assign({}, item);
      }
    );
    const itemIndex = {};
    mergedItems.forEach(function (item, index) {
      itemIndex[handoverItemMergeKey(item)] = index;
    });
    preparedSupplement.forEach(function (item) {
      const key = handoverItemMergeKey(item);
      const index = itemIndex[key];
      if (index === undefined) {
        itemIndex[key] = mergedItems.length;
        mergedItems.push(
          Object.assign({}, item, { supplementRequestIds: [requestId] })
        );
        return;
      }
      const existing = mergedItems[index];
      const addedQty = safeNumber(item.qtyIssued);
      const supplementRequestIds = Array.isArray(existing.supplementRequestIds)
        ? existing.supplementRequestIds.slice()
        : [];
      supplementRequestIds.push(requestId);
      mergedItems[index] = Object.assign({}, existing, {
        selected: true,
        qtyIssued: safeNumber(existing.qtyIssued) + addedQty,
        qtyChecked: Math.max(
          safeNumber(existing.qtyChecked),
          safeNumber(item.qtyChecked)
        ),
        hospitalQty: safeNumber(existing.hospitalQty) + addedQty,
        hospitalRemaining:
          safeNumber(existing.hospitalQty) +
          addedQty -
          safeNumber(existing.usedQty) -
          safeNumber(existing.returnedQty),
        officeAfter: item.officeAfter,
        locationStatus: "DI RUMAH SAKIT",
        supplementRequestIds: supplementRequestIds,
      });
    });

    const mergedInstruments = (Array.isArray(current.Instruments)
      ? current.Instruments
      : []
    ).map(function (item) {
      return Object.assign({}, item);
    });
    const instrumentIndex = {};
    mergedInstruments.forEach(function (item, index) {
      instrumentIndex[String(item.code || item.name || "").trim()] = index;
    });
    requestedInstruments.forEach(function (item) {
      const key = String(item.code || item.name || "").trim();
      const index = instrumentIndex[key];
      if (index === undefined) {
        instrumentIndex[key] = mergedInstruments.length;
        mergedInstruments.push(
          Object.assign({}, item, {
            selected: true,
            supplementRequestIds: [requestId],
          })
        );
      } else {
        const instrumentRequestIds = Array.isArray(
          mergedInstruments[index].supplementRequestIds
        )
          ? mergedInstruments[index].supplementRequestIds.slice()
          : [];
        instrumentRequestIds.push(requestId);
        mergedInstruments[index] = Object.assign({}, mergedInstruments[index], {
          selected: true,
          qty:
            safeNumber(mergedInstruments[index].qty) + safeNumber(item.qty),
          supplementRequestIds: instrumentRequestIds,
        });
      }
    });

    current.Items = mergedItems;
    current.Instruments = mergedInstruments;
    current.HospitalUpdatedAt = new Date();
    current.By = payload.by || current.Sender || "Logistik";
    current.AcceptanceNote = [
      String(current.AcceptanceNote || "").trim(),
      "Kiriman tambahan " +
        Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          "yyyy-MM-dd HH:mm"
        ) +
        " • " +
        preparedSupplement.length +
        " item implant",
    ]
      .filter(function (note) {
        return Boolean(note);
      })
      .join("\n");
    current._allowPostedItems = true;
    return saveHandover(current, true);
  } finally {
    lock.releaseLock();
  }
}

function deleteHandovers(payload) {
  const ids = (Array.isArray(payload.ids) ? payload.ids : [])
    .map(function (id) {
      return String(id || "").trim();
    })
    .filter(function (id, index, values) {
      return id && values.indexOf(id) === index;
    });
  if (!ids.length) {
    return { status: "error", message: "Pilih minimal satu dokumen serah terima" };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { status: "error", message: "Dokumen sedang diproses, coba lagi" };
  }
  try {
    const sheet = getHandoverSheet();
    const rows = sheet.getDataRange().getValues();
    const targets = [];
    const found = {};
    rows.slice(1).forEach(function (row, index) {
      const id = String(row[0] || "");
      if (ids.indexOf(id) < 0) return;
      found[id] = true;
      const status = String(row[17] || "DRAFT").toUpperCase();
      if (status === "DIKIRIM") {
        throw new Error(
          "Dokumen " + id + " masih dalam pengiriman. Terima dan selesaikan stok RS terlebih dahulu."
        );
      }
      if (status === "DITERIMA") {
        let items = [];
        try {
          items = JSON.parse(String(row[10] || "[]"));
        } catch (err) {
          throw new Error("Data implant dokumen " + id + " tidak dapat dibaca");
        }
        const unresolved = items.filter(function (item) {
          const sent = Math.max(
            0,
            safeNumber(
              item.hospitalQty === undefined
                ? item.qtyIssued
                : item.hospitalQty
            )
          );
          if (sent <= 0) return false;
          const accounted =
            Math.max(0, safeNumber(item.usedQty)) +
            Math.max(0, safeNumber(item.returnedQty));
          return accounted < sent;
        });
        if (unresolved.length) {
          throw new Error(
            "Dokumen " +
              id +
              " masih memiliki " +
              unresolved.length +
              " item di rumah sakit. Tandai terpakai atau return ke office terlebih dahulu."
          );
        }
      }
      targets.push(index + 2);
    });
    const missing = ids.filter(function (id) {
      return !found[id];
    });
    if (missing.length) {
      throw new Error("Dokumen tidak ditemukan: " + missing.join(", "));
    }
    targets
      .sort(function (a, b) {
        return b - a;
      })
      .forEach(function (rowNumber) {
        sheet.deleteRow(rowNumber);
      });
    return {
      status: "success",
      deleted: targets.length,
      data: { deleted: targets.length },
      message: targets.length + " dokumen serah terima berhasil dihapus setelah rekonsiliasi stok selesai.",
    };
  } finally {
    lock.releaseLock();
  }
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
      const confirmedLot = String(item.batch || "").trim().toUpperCase();
      if (
        usedDelta > 0 &&
        (!confirmedLot || confirmedLot === "-" || confirmedLot === "N/A" || confirmedLot === "BELUM DIINPUT")
      ) {
        throw new Error(
          "LOT implant " + String(item.partNumber || item.description || "-") +
          " belum diisi. Cocokkan LOT fisik sebelum mencatat pemakaian."
        );
      }
      const stockRow = safeNumber(item.stockRow);
      const supplySource = normalizeSupplySource(item.supplySource);
      const movementNote =
        (supplySource === "SUPPORT PUSAT" ? "SUPPORT PUSAT • " : "STOK OFFICE • ") +
        "REF: " + String(item.partNumber || "-") +
        " • LOT: " + String(item.batch || "-") +
        " • " +
        "Dokter: " + String(current.Surgeon || "-") +
        " • Tanggal: " + String(current.HandoverDate || "-") +
        " • Tindakan: " + String(current.Procedure || "-") +
        " • RS: " + String(current.Hospital || "-");
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
        if (supplySource !== "SUPPORT PUSAT") {
          returnedRow[5] = safeNumber(returnedRow[5]) + returnedDelta;
          returnedRow[6] = returnedRow[5];
        }
        returnedRow[9] = buildMovementDescription(
          "MOBILISASI_MASUK",
          returnedDelta,
          supplySource === "SUPPORT PUSAT"
            ? "Kembali ke pusat • " + movementNote
            : "Kembali ke office • " + movementNote
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
        if (supplySource !== "SUPPORT PUSAT") {
          warningByRow[stockRow] = {
            no: stockRow,
            stockRow: rowArrayToObject(stockRows[stockIndex], stockRow),
            lastMovement: stockRows[stockIndex][9],
          };
        }
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
              ? supplySource === "SUPPORT PUSAT"
                ? "TERPAKAI • SUPPORT PUSAT"
                : "TERPAKAI"
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
    current.ProcedureCompletedAt = new Date();
    current.CompletionNote = String(payload.completionNote || current.CompletionNote || "Tindakan selesai");
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

function migrateDiscontinuedWarningsToStock() {
  const warningSheet = getStockWarningSheet();
  const warningRows = warningSheet.getDataRange().getValues();
  const discontinueColumn = MASTER_HEADERS.indexOf("Discontinue") + 1;
  for (var i = 1; i < warningRows.length; i++) {
    const warningStatus = String(warningRows[i][1] || "").toUpperCase();
    const workflowStatus = String(warningRows[i][13] || "").toUpperCase();
    if (warningStatus !== "DISCONTINUE" && workflowStatus !== "DISCONTINUE") continue;
    const stockSheet = getOrCreateSheet(String(warningRows[i][2] || DEFAULT_SHEET));
    normalizeSheet(stockSheet);
    const stockRow = safeNumber(warningRows[i][3]);
    if (stockRow >= 2 && stockRow <= stockSheet.getLastRow()) {
      stockSheet.getRange(stockRow, discontinueColumn).setValue(true);
    }
  }
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

  if (safeBoolean(stockRow.Discontinue)) {
    if (targetRow) {
      const discontinued = rows[targetRow - 1].slice();
      discontinued[0] = now;
      discontinued[1] = "DISCONTINUE";
      discontinued[10] = "Implant discontinue dan tidak perlu diminta kembali.";
      discontinued[12] = now;
      discontinued[13] = "DISCONTINUE";
      warningSheet.getRange(targetRow, 1, 1, STOCK_WARNING_HEADERS.length)
        .setValues([discontinued.slice(0, STOCK_WARNING_HEADERS.length)]);
    }
    return;
  }

  if (normalizeSupplySource(stockRow.SupplySource) === "SUPPORT PUSAT") {
    if (targetRow) {
      const supported = rows[targetRow - 1].slice();
      supported[0] = now;
      supported[1] = "SELESAI";
      supported[10] = "Item tersedia melalui Support Pusat dan bukan stok fisik office.";
      supported[12] = now;
      supported[13] = "SELESAI";
      warningSheet.getRange(targetRow, 1, 1, STOCK_WARNING_HEADERS.length)
        .setValues([supported.slice(0, STOCK_WARNING_HEADERS.length)]);
    }
    return;
  }

  const isWarning = remaining <= LOW_STOCK_THRESHOLD;
  const status = remaining <= 0 ? "HABIS" : "AKAN HABIS";
  const note =
    remaining <= 0
      ? "WARNING: Implant sudah habis dan tidak tersedia lagi. Segera lakukan refill."
      : "WARNING: Sisa 1. Jika digunakan lagi implant akan habis dan tidak tersedia.";

  if (!isWarning && !targetRow) return;

  const existing = targetRow ? rows[targetRow - 1] : [];
  const wasResolved =
    String(existing[1] || "") === "SELESAI" ||
    String(existing[1] || "") === "DISCONTINUE";
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
      return includeResolved || (
        String(item.Status) !== "SELESAI" &&
        String(item.Status) !== "DISCONTINUE"
      );
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
    "DISCONTINUE",
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
  if (nextStatus === "DISCONTINUE") {
    current[1] = "DISCONTINUE";
    current[10] = "Implant discontinue dan tidak perlu diminta kembali.";
    current[12] = new Date();
  }
  current[14] = hasOwn(payload, "PIC") ? payload.PIC || "" : current[14];
  current[15] = hasOwn(payload, "TargetRefill")
    ? payload.TargetRefill || ""
    : current[15];
  current[16] = hasOwn(payload, "LogisticsNote")
    ? payload.LogisticsNote || ""
    : current[16];

  if (nextStatus === "DISCONTINUE") {
    const stockSheet = getOrCreateSheet(String(current[2] || DEFAULT_SHEET));
    normalizeSheet(stockSheet);
    const stockRow = safeNumber(current[3]);
    if (stockRow >= 2 && stockRow <= stockSheet.getLastRow()) {
      stockSheet.getRange(stockRow, MASTER_HEADERS.indexOf("Discontinue") + 1).setValue(true);
    }
  }
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

function quickUpdateStockWarning(payload) {
  const stockSheetName = String(payload.StockSheet || DEFAULT_SHEET);
  const stockNo = safeNumber(payload.No);
  const ref = String(payload.NoStok || "").trim().toUpperCase();
  const batch = String(payload.Batch || "").trim().toUpperCase();
  const stockSheet = getOrCreateSheet(stockSheetName);
  normalizeSheet(stockSheet);

  if (stockNo >= 2 && stockNo <= stockSheet.getLastRow()) {
    const stockValues = stockSheet
      .getRange(stockNo, 1, 1, MASTER_HEADERS.length)
      .getValues()[0];
    const stockRow = rowArrayToObject(stockValues, stockNo);
    upsertStockWarning(stockSheetName, stockNo, stockRow, stockRow.KET || "Quick action logistik");
  }

  const warningSheet = getStockWarningSheet();
  const rows = warningSheet.getDataRange().getValues();
  var targetRow = 0;
  for (var index = 1; index < rows.length; index++) {
    const sameSheet = String(rows[index][2] || DEFAULT_SHEET) === stockSheetName;
    const sameNo = stockNo > 0 && safeNumber(rows[index][3]) === stockNo;
    const sameIdentity =
      ref &&
      String(rows[index][4] || "").trim().toUpperCase() === ref &&
      String(rows[index][8] || "").trim().toUpperCase() === batch;
    if (sameSheet && (sameNo || sameIdentity)) {
      targetRow = index + 1;
      break;
    }
  }
  if (!targetRow) {
    return { status: "error", message: "Warning stock belum tersedia" };
  }
  return updateStockWarningWorkflow({
    Row: targetRow,
    WorkflowStatus: payload.WorkflowStatus || "SEDANG DIPESAN",
    PIC: payload.PIC || "",
    LogisticsNote: payload.LogisticsNote || "Ditandai dari Warning Stock Modal",
    by: payload.by || "Warning Stock Modal",
  });
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

  const data = [];
  rows.slice(1).forEach(function (r, index) {
    const rowNumber = index + 2;
    const rawChanges = r[idx.Changes] || "[]";
    let groupedItems = [];
    let transactionId = "";
    let transactionSize = 0;
    try {
      const parsed = JSON.parse(rawChanges);
      if (
        parsed &&
        parsed.type === "stock_history_batch" &&
        Array.isArray(parsed.items)
      ) {
        groupedItems = parsed.items;
        transactionId = parsed.transactionId || "";
        transactionSize = safeNumber(parsed.itemCount) || groupedItems.length;
      }
    } catch (ignore) {
      groupedItems = [];
    }

    if (groupedItems.length) {
      groupedItems.forEach(function (item) {
        const itemSheet = item.sheet || r[idx.Sheet] || DEFAULT_SHEET;
        const itemNo = safeNumber(item.no);
        if (targetSheet && itemSheet !== targetSheet) return;
        if (targetNo && itemNo !== targetNo) return;
        data.push({
          Row: rowNumber,
          Rows: [rowNumber],
          Timestamp: r[idx.Timestamp],
          Action: item.action || r[idx.Action],
          Sheet: itemSheet,
          No: itemNo,
          Changes: JSON.stringify(item.changes || []),
          By: item.by || r[idx.By] || "",
          TransactionId: transactionId,
          TransactionSize: transactionSize,
        });
      });
      return;
    }

    if (targetSheet && r[idx.Sheet] !== targetSheet) return;
    if (targetNo && safeNumber(r[idx.No]) !== targetNo) return;
    data.push({
      Row: rowNumber,
      Rows: [rowNumber],
      Timestamp: r[idx.Timestamp],
      Action: r[idx.Action],
      Sheet: r[idx.Sheet],
      No: safeNumber(r[idx.No]),
      Changes: rawChanges,
      By: r[idx.By] || "",
      TransactionId: "",
      TransactionSize: 1,
    });
  });
  data.reverse();

  return { status: "success", data: data };
}

function deleteHistoryRows(payload) {
  const requestedRows = Array.isArray(payload.rows) ? payload.rows : [];
  const rows = requestedRows
    .map(safeNumber)
    .filter(function (row) {
      return row >= 2;
    })
    .filter(function (row, index, values) {
      return values.indexOf(row) === index;
    })
    .sort(function (a, b) {
      return b - a;
    });
  if (!rows.length) {
    return { status: "error", message: "Pilih minimal satu riwayat" };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { status: "error", message: "History sedang diproses, coba lagi" };
  }
  try {
    const sheet = getSheet("History");
    const lastRow = sheet.getLastRow();
    let deleted = 0;
    rows.forEach(function (row) {
      if (row <= lastRow && row >= 2) {
        sheet.deleteRow(row);
        deleted++;
      }
    });
    return {
      status: "success",
      deleted: deleted,
      data: { deleted: deleted },
      message: deleted + " catatan history berhasil dihapus",
    };
  } finally {
    lock.releaseLock();
  }
}

function importStockExcelBatch(body) {
  const payload = body || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const instruments = Array.isArray(payload.instruments) ? payload.instruments : [];
  if (!items.length && !instruments.length) {
    return { status: "error", message: "Tidak ada data Excel yang dapat diimpor" };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { status: "busy", message: "Import lain sedang berjalan. Coba kembali." };
  }

  try {
    const sheet = resolveDataSheet(payload);
    normalizeSheet(sheet);
    const existing = sheet.getDataRange().getValues();
    const existingByKey = {};
    for (var rowIndex = 1; rowIndex < existing.length; rowIndex++) {
      const existingRow = rowArrayToObject(existing[rowIndex], rowIndex + 1);
      const key =
        String(existingRow.NoStok || "").trim().toUpperCase() +
        "::" +
        String(existingRow.Batch || "").trim().toUpperCase();
      if (key !== "::") existingByKey[key] = rowIndex + 1;
    }

    const brand = String(payload.Brand || "ZIMMER").trim().toUpperCase();
    const procedure = String(payload.Procedure || "TKR").trim().toUpperCase();
    const supplySource = normalizeSupplySource(payload.SupplySource);
    const duplicateMode = String(payload.duplicateMode || "SKIP").toUpperCase();
    const appendRows = [];
    const updatedRows = [];
    var skipped = 0;

    items.forEach(function (item) {
      const ref = String(item.NoStok || "").trim();
      const description = String(item.Deskripsi || "").trim();
      if (!ref || !description) return;
      const batch = String(item.Batch || "").trim();
      const key = ref.toUpperCase() + "::" + batch.toUpperCase();
      const targetRow = safeNumber(existingByKey[key]);
      const qty = Math.max(0, safeNumber(item.Qty));

      if (targetRow) {
        if (duplicateMode !== "UPDATE") {
          skipped++;
          return;
        }
        const current = existing[targetRow - 1].slice();
        current[0] = ref;
        current[1] = description;
        current[2] = String(item.Implant || procedure).trim().toUpperCase();
        current[3] = brand;
        current[4] = batch;
        if (payload.replaceStock === true) {
          current[5] = qty;
          current[6] = qty;
        }
        current[11] = supplySource;
        updatedRows.push({ row: targetRow, values: current });
        return;
      }

      appendRows.push([
        ref,
        description,
        String(item.Implant || procedure).trim().toUpperCase(),
        brand,
        batch,
        qty,
        qty,
        0,
        0,
        "Import Excel • " + String(payload.fileName || "file"),
        false,
        supplySource,
      ]);
    });

    updatedRows.forEach(function (entry) {
      sheet
        .getRange(entry.row, 1, 1, MASTER_HEADERS.length)
        .setValues([entry.values.slice(0, MASTER_HEADERS.length)]);
    });
    if (appendRows.length) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, appendRows.length, MASTER_HEADERS.length)
        .setValues(appendRows);
    }

    const instrumentSheet = getOrCreateSheet(INSTRUMENT_MASTER_SHEET);
    ensureHeaderRow(instrumentSheet, INSTRUMENT_MASTER_HEADERS);
    const instrumentRows = instrumentSheet.getDataRange().getValues();
    const instrumentByKey = {};
    for (var instrumentIndex = 1; instrumentIndex < instrumentRows.length; instrumentIndex++) {
      const instrumentKey =
        String(instrumentRows[instrumentIndex][0] || "").trim().toUpperCase() +
        "::" +
        String(instrumentRows[instrumentIndex][1] || "").trim().toUpperCase();
      instrumentByKey[instrumentKey] = instrumentIndex + 1;
    }
    const appendInstruments = [];
    var instrumentUpdated = 0;
    var instrumentSkipped = 0;
    instruments.forEach(function (instrument) {
      const code = String(instrument.Code || "INSTRUMENT").trim();
      const name = String(instrument.Name || "").trim();
      if (!name) return;
      const key = code.toUpperCase() + "::" + name.toUpperCase();
      const values = [
        code,
        name,
        Math.max(0, safeNumber(instrument.Qty)),
        String(instrument.Uom || "SET").toUpperCase(),
        String(instrument.Condition || "BAIK").toUpperCase(),
        procedure,
        brand,
        supplySource,
        new Date(),
      ];
      const targetRow = safeNumber(instrumentByKey[key]);
      if (targetRow && duplicateMode === "UPDATE") {
        instrumentSheet
          .getRange(targetRow, 1, 1, INSTRUMENT_MASTER_HEADERS.length)
          .setValues([values]);
        instrumentUpdated++;
      } else if (targetRow) {
        instrumentSkipped++;
      } else {
        appendInstruments.push(values);
      }
    });
    if (appendInstruments.length) {
      instrumentSheet
        .getRange(
          instrumentSheet.getLastRow() + 1,
          1,
          appendInstruments.length,
          INSTRUMENT_MASTER_HEADERS.length
        )
        .setValues(appendInstruments);
    }

    SpreadsheetApp.flush();
    return {
      status: "success",
      inserted: appendRows.length,
      updated: updatedRows.length,
      skipped: skipped,
      instrumentInserted: appendInstruments.length,
      instrumentUpdated: instrumentUpdated,
      instrumentSkipped: instrumentSkipped,
      message: "Import Excel selesai",
    };
  } finally {
    lock.releaseLock();
  }
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
    safeBoolean(payload.Discontinue),
    String(payload.SupplySource || "OFFICE").toUpperCase(),
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
  const nextDiscontinue = hasOwn(payload, "Discontinue")
    ? safeBoolean(payload.Discontinue)
    : safeBoolean(before.Discontinue);
  const nextSupplySource = hasOwn(payload, "SupplySource")
    ? String(payload.SupplySource || "OFFICE").toUpperCase()
    : String(before.SupplySource || "OFFICE").toUpperCase();

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
    nextDiscontinue,
    nextSupplySource,
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
    SERAH_TERIMA_RS: "Dikirim untuk tindakan operasi",
    MOBILISASI_KELUAR: "Support keluar ke cabang",
    MOBILISASI_MASUK: "Kembali dari cabang",
    STOCK_OPNAME: "Koreksi stock opname",
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
  let no = safeNumber(payload.No);
  const qty = safeNumber(payload.qty);

  if (qty <= 0) return { status: "error", message: "Qty harus > 0" };

  const expectedRef = normalizeBranchIdentity(payload.expectedRef);
  const expectedBatch = normalizeBranchIdentity(payload.expectedBatch);
  if (expectedRef && expectedBatch) {
    const identityMatches = [];
    for (var identityIndex = 1; identityIndex < rows.length; identityIndex++) {
      if (
        normalizeBranchIdentity(rows[identityIndex][0]) === expectedRef &&
        normalizeBranchIdentity(rows[identityIndex][4]) === expectedBatch
      ) identityMatches.push(identityIndex);
    }
    if (identityMatches.length !== 1) {
      return {
        status: "error",
        message: identityMatches.length > 1
          ? "REF dan LOT tercatat ganda. Transaksi dihentikan"
          : "REF atau LOT sudah berubah/tidak ditemukan. Muat ulang data",
      };
    }
    no = identityMatches[0] + 1;
  }
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
  const supportPusat =
    normalizeSupplySource(before.SupplySource) === "SUPPORT PUSAT";

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
    if (!supportPusat) currentQty += qty;
    if (movementReason === "REFILL") refill += qty;
  } else if (type === "out") {
    if (!supportPusat && currentQty < qty) {
      return { status: "error", message: "Stock not enough" };
    }
    if (!supportPusat) currentQty -= qty;
    if (movementReason === "OPERASI") used += qty;
  } else {
    return { status: "error", message: "Invalid mutasi type" };
  }

  const updated = old.slice();
  updated[5] = currentQty;
  updated[7] = used;
  updated[8] = refill;
  updated[6] = currentQty;
  const movementIdentity =
    "REF: " + String(before.NoStok || "-") +
    " • LOT: " + String(before.Batch || "-");
  const movementDescription = buildMovementDescription(
    movementReason,
    qty,
    movementIdentity + " • " + movementNote
  );
  // Kolom KET hanya menyimpan aktivitas paling baru agar mudah dibaca.
  // Aktivitas sebelumnya tetap tersimpan lengkap di sheet History.
  updated[9] =
    !supportPusat && currentQty <= 0 && type === "out"
      ? movementDescription + " • WARNING: STOK HABIS — SEGERA REFILL"
      : (supportPusat ? "SUPPORT PUSAT • " : "") + movementDescription;

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

function postStockOpname(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const items = Array.isArray(payload.Items) ? payload.Items : [];
    if (!items.length) throw new Error("Belum ada hasil opname untuk disimpan");
    const note = String(payload.Note || "").trim();
    const actor = String(payload.By || "").trim() || "Stock Opname";
    if (!note) throw new Error("Catatan/alasan koreksi opname wajib diisi");
    const sheet = getOrCreateSheet(DEFAULT_SHEET);
    normalizeSheet(sheet);
    const rows = sheet.getDataRange().getValues();
    const historyEntries = [];
    const warningEntries = [];
    const transactionId = String(payload.TransactionID || ("OPN-" + Utilities.getUuid()));

    items.forEach(function (item) {
      const no = safeNumber(item.stockRow);
      const index = no - 1;
      if (index < 1 || index >= rows.length) throw new Error("Baris opname tidak ditemukan");
      const before = rowArrayToObject(rows[index], no);
      if (
        normalizeBranchIdentity(before.NoStok) !== normalizeBranchIdentity(item.ref) ||
        normalizeBranchIdentity(before.Batch) !== normalizeBranchIdentity(item.batch)
      ) throw new Error("REF/LOT berubah. Muat ulang data sebelum menyimpan opname");
      const physical = Math.max(0, safeNumber(item.physicalQty));
      const systemQty = safeNumber(before.TotalQty);
      const difference = physical - systemQty;
      if (difference === 0) return;
      const updated = rows[index].slice();
      updated[5] = physical;
      updated[6] = physical;
      updated[9] = buildMovementDescription(
        "STOCK_OPNAME",
        Math.abs(difference),
        "REF: " + before.NoStok + " • LOT: " + (before.Batch || "-") +
        " • Sistem: " + systemQty + " • Fisik: " + physical + " • " + note
      );
      rows[index] = updated;
      const after = rowArrayToObject(updated, no);
      historyEntries.push({ action: "STOCK_OPNAME", no: no, before: before, after: after, by: actor });
      warningEntries.push({ no: no, stockRow: after, lastMovement: updated[9] });
      upsertInventoryLocation({
        location: "OFFICE DENPASAR", stockSheet: DEFAULT_SHEET, stockRow: no,
        ref: before.NoStok, batch: before.Batch, description: before.Deskripsi,
        brand: before.Brand, implant: before.Implant, condition: "AVAILABLE", by: actor,
      }, 0, physical);
      recordInventoryLedger({
        transactionId: transactionId + "-" + no,
        action: "STOCK_OPNAME_ADJUSTMENT",
        fromLocation: difference < 0 ? "OFFICE DENPASAR" : "PENYESUAIAN OPNAME",
        toLocation: difference < 0 ? "PENYESUAIAN OPNAME" : "OFFICE DENPASAR",
        stockSheet: DEFAULT_SHEET, stockRow: no, ref: before.NoStok,
        batch: before.Batch, qty: Math.abs(difference), condition: "AVAILABLE",
        referenceType: "STOCK_OPNAME", referenceId: transactionId,
        note: note, by: actor,
      });
    });
    if (historyEntries.length) {
      sheet.getRange(2, 1, rows.length - 1, MASTER_HEADERS.length).setValues(
        rows.slice(1).map(function (row) { return row.slice(0, MASTER_HEADERS.length); })
      );
      appendHistoryBatch(historyEntries);
      updateWarningsBatch(warningEntries);
    }
    return { status: "success", TransactionID: transactionId, adjusted: historyEntries.length };
  } finally {
    lock.releaseLock();
  }
}

function postInventoryCondition(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const allowed = ["QUARANTINE", "DAMAGED", "EXPIRED"];
    const condition = String(payload.Condition || "").toUpperCase();
    if (allowed.indexOf(condition) < 0) throw new Error("Kondisi barang tidak valid");
    const qty = safeNumber(payload.Qty);
    if (qty <= 0) throw new Error("Jumlah barang harus lebih dari 0");
    const note = String(payload.Note || "").trim();
    if (!note) throw new Error("Alasan perubahan kondisi wajib diisi");
    const actor = String(payload.By || "").trim() || "Logistik";
    const sheet = getOrCreateSheet(DEFAULT_SHEET);
    normalizeSheet(sheet);
    const rows = sheet.getDataRange().getValues();
    const no = safeNumber(payload.StockRow);
    const index = no - 1;
    if (index < 1 || index >= rows.length) throw new Error("Baris stok tidak ditemukan");
    const before = rowArrayToObject(rows[index], no);
    if (
      normalizeBranchIdentity(before.NoStok) !== normalizeBranchIdentity(payload.Ref) ||
      normalizeBranchIdentity(before.Batch) !== normalizeBranchIdentity(payload.Batch)
    ) throw new Error("REF/LOT berubah. Muat ulang data");
    if (normalizeSupplySource(before.SupplySource) === "SUPPORT PUSAT") {
      throw new Error("Kondisi stok Support Pusat tidak dapat diubah dari office");
    }
    const available = safeNumber(before.TotalQty);
    if (available < qty) throw new Error("Stok tersedia tidak cukup");
    const updated = rows[index].slice();
    updated[5] = available - qty;
    updated[6] = updated[5];
    updated[9] = buildMovementDescription(
      "CONDITION_" + condition,
      qty,
      "REF: " + before.NoStok + " • LOT: " + (before.Batch || "-") + " • " + note
    );
    sheet.getRange(no, 1, 1, MASTER_HEADERS.length).setValues([updated]);
    const after = rowArrayToObject(updated, no);
    appendHistoryBatch([{ action: "CONDITION_" + condition, no: no, before: before, after: after, by: actor }]);
    updateWarningsBatch([{ no: no, stockRow: after, lastMovement: updated[9] }]);
    upsertInventoryLocation({
      location: "OFFICE DENPASAR", stockSheet: DEFAULT_SHEET, stockRow: no,
      ref: before.NoStok, batch: before.Batch, description: before.Deskripsi,
      brand: before.Brand, implant: before.Implant, condition: "AVAILABLE", by: actor,
    }, 0, available - qty);
    upsertInventoryLocation({
      location: "OFFICE DENPASAR", stockSheet: DEFAULT_SHEET, stockRow: no,
      ref: before.NoStok, batch: before.Batch, description: before.Deskripsi,
      brand: before.Brand, implant: before.Implant, condition: condition, by: actor,
    }, qty);
    recordInventoryLedger({
      transactionId: "COND-" + Utilities.getUuid(), action: "CONDITION_" + condition,
      fromLocation: "OFFICE DENPASAR", toLocation: "OFFICE DENPASAR",
      stockSheet: DEFAULT_SHEET, stockRow: no, ref: before.NoStok,
      batch: before.Batch, qty: qty, condition: condition,
      referenceType: "STOCK_CONDITION", referenceId: String(payload.ReferenceID || ""),
      note: note, by: actor,
    });
    return { status: "success", newQty: available - qty, condition: condition };
  } finally {
    lock.releaseLock();
  }
}

function ensureBranchTransferSheet() {
  const sheet = getOrCreateSheet(BRANCH_TRANSFER_SHEET);
  ensureHeaderRow(sheet, BRANCH_TRANSFER_HEADERS);
  sheet
    .getRange(1, 1, 1, BRANCH_TRANSFER_HEADERS.length)
    .setValues([BRANCH_TRANSFER_HEADERS])
    .setFontWeight("bold")
    .setBackground("#172554")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureInventoryLocationSheets() {
  const locationSheet = getOrCreateSheet(INVENTORY_LOCATION_SHEET);
  ensureHeaderRow(locationSheet, INVENTORY_LOCATION_HEADERS);
  locationSheet
    .getRange(1, 1, 1, INVENTORY_LOCATION_HEADERS.length)
    .setValues([INVENTORY_LOCATION_HEADERS])
    .setFontWeight("bold")
    .setBackground("#065f46")
    .setFontColor("#ffffff");
  locationSheet.setFrozenRows(1);

  const ledgerSheet = getOrCreateSheet(INVENTORY_LEDGER_SHEET);
  ensureHeaderRow(ledgerSheet, INVENTORY_LEDGER_HEADERS);
  ledgerSheet
    .getRange(1, 1, 1, INVENTORY_LEDGER_HEADERS.length)
    .setValues([INVENTORY_LEDGER_HEADERS])
    .setFontWeight("bold")
    .setBackground("#1e3a8a")
    .setFontColor("#ffffff");
  ledgerSheet.setFrozenRows(1);
  ledgerSheet.getRange("B:B").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  return { locationSheet: locationSheet, ledgerSheet: ledgerSheet };
}

function normalizeLocationName(value) {
  return String(value || "OFFICE DENPASAR").trim().replace(/\s+/g, " ").toUpperCase();
}

function inventoryLocationKey(location, stockSheet, stockRow, ref, batch, condition) {
  return [
    normalizeLocationName(location),
    String(stockSheet || DEFAULT_SHEET),
    safeNumber(stockRow),
    normalizeBranchIdentity(ref),
    normalizeBranchIdentity(batch),
    String(condition || "AVAILABLE").toUpperCase(),
  ].join("|");
}

function upsertInventoryLocation(entry, delta, absoluteQty) {
  const sheets = ensureInventoryLocationSheets();
  const sheet = sheets.locationSheet;
  const rows = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, INVENTORY_LOCATION_HEADERS.length).getValues()
    : [];
  const key = inventoryLocationKey(
    entry.location, entry.stockSheet, entry.stockRow, entry.ref, entry.batch, entry.condition
  );
  let index = -1;
  for (var i = 0; i < rows.length; i++) {
    if (inventoryLocationKey(rows[i][0], rows[i][1], rows[i][2], rows[i][3], rows[i][4], rows[i][9]) === key) {
      index = i;
      break;
    }
  }
  const previousQty = index >= 0 ? safeNumber(rows[index][8]) : 0;
  const nextQty = absoluteQty === undefined
    ? Math.max(0, previousQty + safeNumber(delta))
    : Math.max(0, safeNumber(absoluteQty));
  const values = [
    normalizeLocationName(entry.location),
    entry.stockSheet || DEFAULT_SHEET,
    safeNumber(entry.stockRow),
    entry.ref || "",
    entry.batch || "",
    entry.description || "",
    entry.brand || "",
    entry.implant || "",
    nextQty,
    String(entry.condition || "AVAILABLE").toUpperCase(),
    new Date(),
    entry.by || "System",
  ];
  if (index >= 0) sheet.getRange(index + 2, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  return nextQty;
}

function recordInventoryLedger(entry) {
  const sheet = ensureInventoryLocationSheets().ledgerSheet;
  sheet.appendRow([
    entry.transactionId || ("INV-" + Utilities.getUuid()),
    new Date(),
    entry.action || "MOVE",
    normalizeLocationName(entry.fromLocation),
    normalizeLocationName(entry.toLocation),
    entry.stockSheet || DEFAULT_SHEET,
    safeNumber(entry.stockRow),
    entry.ref || "",
    entry.batch || "",
    safeNumber(entry.qty),
    String(entry.condition || "AVAILABLE").toUpperCase(),
    entry.referenceType || "MANUAL",
    entry.referenceId || "",
    entry.note || "",
    entry.by || "System",
  ]);
}

function postInventoryMovement(entry) {
  const qty = safeNumber(entry.qty);
  if (qty <= 0) return;
  const base = {
    stockSheet: entry.stockSheet || DEFAULT_SHEET,
    stockRow: entry.stockRow,
    ref: entry.ref,
    batch: entry.batch,
    description: entry.description,
    brand: entry.brand,
    implant: entry.implant,
    condition: entry.condition || "AVAILABLE",
    by: entry.by,
  };
  if (entry.fromLocation) {
    upsertInventoryLocation(Object.assign({}, base, { location: entry.fromLocation }), -qty);
  }
  if (entry.toLocation) {
    upsertInventoryLocation(Object.assign({}, base, { location: entry.toLocation }), qty);
  }
  recordInventoryLedger(entry);
}

function syncOfficeInventoryLocations() {
  const stockSheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(stockSheet);
  const rows = stockSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    const row = rowArrayToObject(rows[i], i + 1);
    if (normalizeSupplySource(row.SupplySource) === "SUPPORT PUSAT") continue;
    upsertInventoryLocation({
      location: "OFFICE DENPASAR",
      stockSheet: DEFAULT_SHEET,
      stockRow: i + 1,
      ref: row.NoStok,
      batch: row.Batch,
      description: row.Deskripsi,
      brand: row.Brand,
      implant: row.Implant,
      condition: "AVAILABLE",
      by: "Stock sync",
    }, 0, safeNumber(row.TotalQty));
  }
  return listInventoryLocations({});
}

function listInventoryLocations(parameter) {
  const sheet = ensureInventoryLocationSheets().locationSheet;
  const location = normalizeLocationName(parameter && parameter.location);
  const useFilter = Boolean(parameter && parameter.location);
  const rows = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, INVENTORY_LOCATION_HEADERS.length).getValues()
    : [];
  const data = rows.map(function (row) {
    const item = {};
    INVENTORY_LOCATION_HEADERS.forEach(function (header, index) { item[header] = row[index]; });
    return item;
  }).filter(function (item) {
    return safeNumber(item.Qty) > 0 && (!useFilter || normalizeLocationName(item.Location) === location);
  });
  return { status: "success", data: data };
}

function branchTransferObject(row) {
  const item = {};
  BRANCH_TRANSFER_HEADERS.forEach(function (header, index) {
    item[header] = row[index] === undefined ? "" : row[index];
  });
  try {
    item.Items = JSON.parse(String(item.ItemsJson || "[]"));
  } catch (ignore) {
    item.Items = [];
  }
  delete item.ItemsJson;
  return item;
}

function listBranchTransfers(parameter) {
  const sheet = ensureBranchTransferSheet();
  if (sheet.getLastRow() < 2) return { status: "success", data: [] };
  const requestedId = String((parameter && parameter.id) || "").trim();
  const data = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, BRANCH_TRANSFER_HEADERS.length)
    .getValues()
    .map(branchTransferObject)
    .filter(function (item) { return !requestedId || item.ID === requestedId; })
    .reverse();
  return { status: "success", data: data };
}

function saveBranchTransferPhoto(dataUrl, transferId, previousFileId) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { url: "", fileId: "" };
  const extension = match[1].indexOf("png") >= 0 ? "png" : "jpg";
  const blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    match[1],
    "mutasi-" + transferId + "." + extension
  );
  const file = DriveApp.getFolderById(BACKUP_FOLDER_ID).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  if (previousFileId) {
    try { DriveApp.getFileById(previousFileId).setTrashed(true); } catch (ignore) {}
  }
  return {
    url: "https://drive.google.com/uc?export=view&id=" + file.getId(),
    fileId: file.getId(),
  };
}

function normalizeBranchIdentity(value) {
  return String(value || "").trim().toUpperCase();
}

function resolveBranchTransferItems(items, stockRows) {
  if (!items.length) throw new Error("Pilih minimal satu implant");
  return items.map(function (item) {
    const ref = normalizeBranchIdentity(item.ref);
    const batch = normalizeBranchIdentity(item.batch);
    if (!ref || !batch) {
      throw new Error("REF dan LOT wajib tersedia pada setiap implant");
    }
    const matches = [];
    for (var rowIndex = 1; rowIndex < stockRows.length; rowIndex++) {
      if (
        normalizeBranchIdentity(stockRows[rowIndex][0]) === ref &&
        normalizeBranchIdentity(stockRows[rowIndex][4]) === batch
      ) {
        matches.push(rowIndex);
      }
    }
    if (matches.length === 0) {
      throw new Error("REF " + item.ref + " LOT " + item.batch + " tidak ditemukan");
    }
    if (matches.length > 1) {
      throw new Error(
        "REF " + item.ref + " LOT " + item.batch +
        " tercatat ganda. Rapikan master stok sebelum melanjutkan"
      );
    }
    const index = matches[0];
    return Object.assign({}, item, {
      stockRow: index + 1,
      ref: String(stockRows[index][0] || ""),
      description: String(stockRows[index][1] || item.description || ""),
      batch: String(stockRows[index][4] || ""),
      availableAtSend: safeNumber(stockRows[index][5]),
    });
  });
}

function validateBranchTransferItems(items) {
  const stockSheet = getOrCreateSheet(DEFAULT_SHEET);
  normalizeSheet(stockSheet);
  const rows = stockSheet.getDataRange().getValues();
  const resolved = resolveBranchTransferItems(items, rows);
  resolved.forEach(function (item) {
    const qty = safeNumber(item.qty);
    if (qty <= 0) throw new Error("Jumlah kirim harus lebih dari 0");
    const index = safeNumber(item.stockRow) - 1;
    const available = safeNumber(rows[index][5]);
    if (available < qty) {
      throw new Error(
        "Stok " + String(item.ref || rows[index][0]) + " batch " +
        String(item.batch || rows[index][4]) + " tidak cukup"
      );
    }
  });
  return resolved;
}

function validateLocationTransferItems(items, origin) {
  const balances = listInventoryLocations({ location: origin }).data;
  return items.map(function (item) {
    const matches = balances.filter(function (balance) {
      return safeNumber(balance.StockRow) === safeNumber(item.stockRow) &&
        normalizeBranchIdentity(balance.NoStok) === normalizeBranchIdentity(item.ref) &&
        normalizeBranchIdentity(balance.Batch) === normalizeBranchIdentity(item.batch) &&
        String(balance.Condition || "AVAILABLE") === "AVAILABLE";
    });
    if (matches.length !== 1) throw new Error("Saldo REF " + item.ref + " LOT " + item.batch + " tidak ditemukan di " + origin);
    const qty = safeNumber(item.qty);
    if (qty <= 0 || safeNumber(matches[0].Qty) < qty) throw new Error("Saldo " + item.ref + " di " + origin + " tidak cukup");
    return Object.assign({}, item, { availableAtSend: safeNumber(matches[0].Qty) });
  });
}

function saveBranchTransfer(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = ensureBranchTransferSheet();
    const now = new Date().toISOString();
    const id = String(payload.ID || ("MT-" + Utilities.getUuid().slice(0, 8))).trim();
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, BRANCH_TRANSFER_HEADERS.length).getValues()
      : [];
    const existingIndex = rows.findIndex(function (row) { return String(row[0]) === id; });
    const previous = existingIndex >= 0 ? branchTransferObject(rows[existingIndex]) : null;
    const previousStatus = previous ? String(previous.Status || "DRAFT") : "DRAFT";
    const nextStatus = String(payload.Status || previousStatus || "DRAFT").toUpperCase();
    if (["DRAFT", "DIKIRIM", "DITERIMA_SEBAGIAN", "DITERIMA"].indexOf(nextStatus) < 0) {
      throw new Error("Status mutasi tidak valid");
    }
    if (previousStatus === "DITERIMA") throw new Error("Mutasi yang sudah diterima terkunci");
    if (["DIKIRIM", "DITERIMA_SEBAGIAN"].indexOf(previousStatus) >= 0 && nextStatus === "DRAFT") {
      throw new Error("Mutasi yang sudah dikirim tidak dapat kembali menjadi draft");
    }
    let items = Array.isArray(payload.Items)
      ? payload.Items.filter(function (item) { return safeNumber(item.qty) > 0; })
      : (previous && previous.Items) || [];
    const destination = String(payload.Destination || (previous && previous.Destination) || "").trim();
    const origin = String(payload.Origin || (previous && previous.Origin) || "Office Denpasar").trim();
    const transferType = String(payload.TransferType || (previous && previous.TransferType) || "MUTASI_KELUAR").toUpperCase();
    const transitLocation = "DALAM PERJALANAN • " + destination;
    if (!destination) throw new Error("Cabang tujuan wajib diisi");
    if (nextStatus === "DIKIRIM" && previousStatus === "DRAFT") {
      items = transferType === "RETURN_CABANG"
        ? validateLocationTransferItems(items, origin)
        : validateBranchTransferItems(items);
      items.forEach(function (item) {
        if (transferType === "RETURN_CABANG") {
          upsertInventoryLocation({
            location: origin, stockSheet: DEFAULT_SHEET, stockRow: item.stockRow,
            ref: item.ref, batch: item.batch, description: item.description,
            condition: "AVAILABLE", by: payload.By || payload.Sender || "Cabang",
          }, -safeNumber(item.qty));
        } else {
          const result = handleMutasi({
            sheet: DEFAULT_SHEET,
            No: safeNumber(item.stockRow),
            qty: safeNumber(item.qty),
            type: "out",
            movementReason: "MOBILISASI_KELUAR",
            note: "Support luar cabang • Tujuan: " + destination,
            by: payload.By || payload.Sender || "Logistik",
          });
          if (result.status !== "success") throw new Error(result.message || "Stok gagal dimutasi");
          upsertInventoryLocation({
            location: origin, stockSheet: DEFAULT_SHEET, stockRow: item.stockRow,
            ref: item.ref, batch: item.batch, description: item.description,
            condition: "AVAILABLE", by: payload.By || payload.Sender || "Logistik",
          }, 0, result.newQty);
        }
        upsertInventoryLocation({
          location: transitLocation,
          stockSheet: DEFAULT_SHEET,
          stockRow: item.stockRow,
          ref: item.ref,
          batch: item.batch,
          description: item.description,
          condition: "IN_TRANSIT",
          by: payload.By || payload.Sender || "Logistik",
        }, safeNumber(item.qty));
        recordInventoryLedger({
          transactionId: id + "-SEND-" + safeNumber(item.stockRow),
          action: transferType === "RETURN_CABANG" ? "BRANCH_RETURN_SENT" : "TRANSFER_SENT",
          fromLocation: origin,
          toLocation: transitLocation,
          stockSheet: DEFAULT_SHEET,
          stockRow: item.stockRow,
          ref: item.ref,
          batch: item.batch,
          qty: item.qty,
          condition: "IN_TRANSIT",
          referenceType: "BRANCH_TRANSFER",
          referenceId: id,
          note: (transferType === "RETURN_CABANG" ? "Return dikirim ke " : "Dikirim ke ") + destination,
          by: payload.By || payload.Sender || "Logistik",
        });
      });
    }
    if (["DITERIMA_SEBAGIAN", "DITERIMA"].indexOf(nextStatus) >= 0 && ["DIKIRIM", "DITERIMA_SEBAGIAN"].indexOf(previousStatus) >= 0) {
      const previousItems = previous && Array.isArray(previous.Items) ? previous.Items : [];
      items = items.map(function (item) {
        const previousItem = previousItems.filter(function (candidate) {
          return safeNumber(candidate.stockRow) === safeNumber(item.stockRow);
        })[0] || {};
        const previousReceived = Math.max(0, safeNumber(previousItem.receivedQty));
        const requestedReceived = nextStatus === "DITERIMA"
          ? safeNumber(item.qty)
          : Math.min(safeNumber(item.qty), Math.max(previousReceived, safeNumber(item.receivedQty)));
        const receivedDelta = Math.max(0, requestedReceived - previousReceived);
        if (receivedDelta <= 0) return Object.assign({}, item, { receivedQty: previousReceived });
        upsertInventoryLocation({
          location: transitLocation,
          stockSheet: DEFAULT_SHEET,
          stockRow: item.stockRow,
          ref: item.ref,
          batch: item.batch,
          description: item.description,
          condition: "IN_TRANSIT",
          by: payload.By || payload.Receiver || "Cabang",
        }, -receivedDelta);
        upsertInventoryLocation({
          location: destination,
          stockSheet: DEFAULT_SHEET,
          stockRow: item.stockRow,
          ref: item.ref,
          batch: item.batch,
          description: item.description,
          condition: "AVAILABLE",
          by: payload.By || payload.Receiver || "Cabang",
        }, receivedDelta);
        recordInventoryLedger({
          transactionId: id + "-RECEIVE-" + safeNumber(item.stockRow),
          action: "TRANSFER_RECEIVED",
          fromLocation: transitLocation,
          toLocation: destination,
          stockSheet: DEFAULT_SHEET,
          stockRow: item.stockRow,
          ref: item.ref,
          batch: item.batch,
          qty: receivedDelta,
          condition: "AVAILABLE",
          referenceType: "BRANCH_TRANSFER",
          referenceId: id,
          note: "Diterima di " + destination,
          by: payload.By || payload.Receiver || "Cabang",
        });
        if (transferType === "RETURN_CABANG" && normalizeLocationName(destination) === "OFFICE DENPASAR") {
          const returnResult = handleMutasi({
            sheet: DEFAULT_SHEET, No: safeNumber(item.stockRow), qty: receivedDelta,
            type: "in", movementReason: "MOBILISASI_MASUK",
            note: "Return diterima dari " + origin,
            by: payload.By || payload.Receiver || "Logistik",
          });
          if (returnResult.status !== "success") throw new Error(returnResult.message || "Return gagal masuk stok office");
          upsertInventoryLocation({
            location: destination, stockSheet: DEFAULT_SHEET, stockRow: item.stockRow,
            ref: item.ref, batch: item.batch, description: item.description,
            condition: "AVAILABLE", by: payload.By || payload.Receiver || "Logistik",
          }, 0, returnResult.newQty);
        }
        return Object.assign({}, item, { receivedQty: requestedReceived });
      });
      const allReceived = items.every(function (item) {
        return safeNumber(item.receivedQty) >= safeNumber(item.qty);
      });
      if (nextStatus === "DITERIMA_SEBAGIAN" && allReceived) {
        throw new Error("Semua barang sudah diterima. Gunakan status DITERIMA");
      }
    }
    let photoUrl = String(payload.PhotoUrl || (previous && previous.PhotoUrl) || "");
    let photoFileId = String(payload.PhotoFileId || (previous && previous.PhotoFileId) || "");
    if (payload.PhotoDataUrl) {
      const saved = saveBranchTransferPhoto(payload.PhotoDataUrl, id, photoFileId);
      photoUrl = saved.url;
      photoFileId = saved.fileId;
    }
    const createdAt = (previous && previous.CreatedAt) || now;
    const sentAt = nextStatus !== "DRAFT" ? ((previous && previous.SentAt) || now) : "";
    const receivedAt = nextStatus === "DITERIMA" ? now : ((previous && previous.ReceivedAt) || "");
    const values = [
      id, createdAt, now, nextStatus,
      origin,
      destination, JSON.stringify(items), String(payload.Note || (previous && previous.Note) || ""),
      String(payload.Sender || (previous && previous.Sender) || ""),
      String(payload.Receiver || (previous && previous.Receiver) || ""),
      photoUrl, photoFileId, sentAt, receivedAt,
      String(payload.By || (previous && previous.By) || payload.Sender || ""),
      transferType,
    ];
    const rowNumber = existingIndex >= 0 ? existingIndex + 2 : sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
    return { status: "success", ID: id, data: branchTransferObject(values) };
  } finally {
    lock.releaseLock();
  }
}

function correctBranchTransfer(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const transferSheet = ensureBranchTransferSheet();
    const transferRows = transferSheet.getLastRow() > 1
      ? transferSheet.getRange(2, 1, transferSheet.getLastRow() - 1, BRANCH_TRANSFER_HEADERS.length).getValues()
      : [];
    const id = String(payload.ID || "").trim();
    const transferIndex = transferRows.findIndex(function (row) { return String(row[0]) === id; });
    if (transferIndex < 0) throw new Error("Dokumen mutasi tidak ditemukan");
    const current = branchTransferObject(transferRows[transferIndex]);
    if (String(current.Status) !== "DIKIRIM") {
      throw new Error("Hanya mutasi yang masih dalam pengiriman dapat dikoreksi");
    }
    const requestedNextItems = Array.isArray(payload.Items)
      ? payload.Items.filter(function (item) { return safeNumber(item.qty) > 0; })
      : [];
    if (!requestedNextItems.length) throw new Error("Pilih minimal satu implant pengganti");

    const stockSheet = getOrCreateSheet(DEFAULT_SHEET);
    normalizeSheet(stockSheet);
    const stockRows = stockSheet.getDataRange().getValues();
    const currentItems = resolveBranchTransferItems(current.Items, stockRows);
    const nextItems = resolveBranchTransferItems(requestedNextItems, stockRows);
    const returnedByRow = {};
    currentItems.forEach(function (item) {
      const row = safeNumber(item.stockRow);
      returnedByRow[row] = safeNumber(returnedByRow[row]) + safeNumber(item.qty);
    });
    nextItems.forEach(function (item) {
      const row = safeNumber(item.stockRow);
      const index = row - 1;
      if (index < 1 || index >= stockRows.length) {
        throw new Error("Baris stok pengganti tidak ditemukan");
      }
      const effectiveAvailable = safeNumber(stockRows[index][5]) + safeNumber(returnedByRow[row]);
      if (effectiveAvailable < safeNumber(item.qty)) {
        throw new Error(
          "Stok pengganti REF " + String(item.ref || stockRows[index][0]) +
          " LOT " + String(item.batch || stockRows[index][4]) + " tidak cukup"
        );
      }
    });

    currentItems.forEach(function (item) {
      const result = handleMutasi({
        sheet: DEFAULT_SHEET,
        No: safeNumber(item.stockRow),
        qty: safeNumber(item.qty),
        type: "in",
        movementReason: "MOBILISASI_MASUK",
        note: "Koreksi support cabang • Batch lama dikembalikan • Tujuan: " + current.Destination,
        by: payload.By || current.Sender || "Logistik",
      });
      if (result.status !== "success") throw new Error(result.message || "Batch lama gagal dikembalikan");
    });
    nextItems.forEach(function (item) {
      const result = handleMutasi({
        sheet: DEFAULT_SHEET,
        No: safeNumber(item.stockRow),
        qty: safeNumber(item.qty),
        type: "out",
        movementReason: "MOBILISASI_KELUAR",
        note: "Koreksi support luar cabang • Tujuan: " + current.Destination,
        by: payload.By || current.Sender || "Logistik",
      });
      if (result.status !== "success") throw new Error(result.message || "Batch pengganti gagal dikeluarkan");
    });

    let photoUrl = String(current.PhotoUrl || "");
    let photoFileId = String(current.PhotoFileId || "");
    if (payload.PhotoDataUrl) {
      const saved = saveBranchTransferPhoto(payload.PhotoDataUrl, id, photoFileId);
      photoUrl = saved.url;
      photoFileId = saved.fileId;
    }
    const now = new Date().toISOString();
    const values = [
      current.ID, current.CreatedAt, now, current.Status,
      current.Origin, current.Destination, JSON.stringify(nextItems),
      String(payload.Note || current.Note || ""),
      String(payload.Sender || current.Sender || ""),
      String(payload.Receiver || current.Receiver || ""),
      photoUrl, photoFileId, current.SentAt, current.ReceivedAt,
      String(payload.By || current.By || current.Sender || ""),
    ];
    transferSheet.getRange(transferIndex + 2, 1, 1, values.length).setValues([values]);
    return { status: "success", data: branchTransferObject(values) };
  } finally {
    lock.releaseLock();
  }
}

function handleDuplicate(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  normalizeSheet(sheet);
  const rows = sheet.getDataRange().getValues();
  const targetNo = safeNumber(payload.No);
  const newRef = String(payload.NoStok || "").trim();
  const newBatch = String(payload.Batch || "").trim();
  const newQty = safeNumber(payload.Qty);

  if (!newRef || !newBatch) {
    return { status: "error", message: "REF dan LOT/Batch baru wajib diisi" };
  }
  if (newQty <= 0) {
    return { status: "error", message: "Qty awal harus lebih dari 0" };
  }

  const idx = targetNo - 1;
  if (idx < 1 || idx >= rows.length) {
    return { status: "error", message: "Baris data tidak ditemukan" };
  }

  const duplicateExists = rows.slice(1).some(function (row) {
    return String(row[0] || "").trim().toUpperCase() === newRef.toUpperCase() &&
      String(row[4] || "").trim().toUpperCase() === newBatch.toUpperCase();
  });
  if (duplicateExists) {
    return { status: "error", message: "Kombinasi REF dan LOT/Batch sudah tersedia" };
  }

  const source = rows[idx].slice();
  const newRow = source.slice();
  newRow[0] = newRef;
  newRow[4] = newBatch;
  newRow[5] = newQty;
  newRow[6] = newQty;
  newRow[7] = 0;
  newRow[8] = 0;
  newRow[9] = "Duplikasi varian REF/LOT dari " + String(source[0] || "-") +
    " batch " + String(source[4] || "-");
  newRow[10] = false;
  sheet.appendRow(newRow);
  const newNo = sheet.getLastRow();

  upsertStockWarning(
    sheet.getName(),
    newNo,
    rowArrayToObject(newRow, newNo),
    newRow[9]
  );

  logHistory(
    "DUPLICATE",
    sheet.getName(),
    newNo,
    rowArrayToObject(source, targetNo),
    rowArrayToObject(newRow, newNo),
    payload.by
  );

  const productTotal = rows.slice(1).reduce(function (total, row) {
    const sameName = String(row[1] || "").trim().toUpperCase() ===
      String(source[1] || "").trim().toUpperCase();
    const sameBrand = String(row[3] || "").trim().toUpperCase() ===
      String(source[3] || "").trim().toUpperCase();
    return sameName && sameBrand ? total + safeNumber(row[5]) : total;
  }, newQty);

  return { status: "success", No: newNo, productTotal: productTotal };
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

function getMonthlyBackupPeriod(date) {
  return Utilities.formatDate(
    date || new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM"
  );
}

function getBackupLogSheet() {
  const sheet = getOrCreateSheet(BACKUP_LOG_SHEET);
  ensureHeaderRow(sheet, BACKUP_LOG_HEADERS);
  return sheet;
}

function findMonthlyBackup(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  return files.hasNext() ? files.next() : null;
}

function autoBackupMonthly(force) {
  if (!BACKUP_FOLDER_ID || BACKUP_FOLDER_ID === "YOUR_BACKUP_FOLDER_ID") {
    throw new Error("BACKUP_FOLDER_ID belum diisi");
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      status: "busy",
      message: "Backup bulanan lain sedang diproses",
    };
  }

  try {
    const now = new Date();
    const period = getMonthlyBackupPeriod(now);
    const ss = getApplicationSpreadsheet();
    const folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
    const fileName = "Backup_Bulanan_" + ss.getName() + "_" + period;
    const properties = PropertiesService.getScriptProperties();
    const propertyKey = "MONTHLY_BACKUP_" + period;
    const savedFileId = properties.getProperty(propertyKey);
    let existing = null;

    if (!force && savedFileId) {
      try {
        existing = DriveApp.getFileById(savedFileId);
      } catch (ignore) {
        existing = null;
      }
    }
    if (!force && !existing) existing = findMonthlyBackup(folder, fileName);

    if (existing) {
      properties.setProperty(propertyKey, existing.getId());
      return {
        status: "exists",
        period: period,
        fileId: existing.getId(),
        fileName: existing.getName(),
        backupUrl: existing.getUrl(),
        message: "Backup bulan " + period + " sudah tersedia",
      };
    }

    const sourceFile = DriveApp.getFileById(ss.getId());
    const backupFile = sourceFile.makeCopy(fileName, folder);
    properties.setProperty(propertyKey, backupFile.getId());
    properties.setProperty("MONTHLY_BACKUP_LAST_PERIOD", period);
    properties.setProperty("MONTHLY_BACKUP_LAST_AT", now.toISOString());
    properties.setProperty("MONTHLY_BACKUP_LAST_FILE_ID", backupFile.getId());

    getBackupLogSheet().appendRow([
      now,
      period,
      backupFile.getName(),
      backupFile.getId(),
      backupFile.getUrl(),
      "SUCCESS",
      force ? "MANUAL" : "AUTO",
    ]);

    return {
      status: "success",
      period: period,
      fileId: backupFile.getId(),
      fileName: backupFile.getName(),
      backupUrl: backupFile.getUrl(),
      message: "Backup bulanan berhasil dibuat",
    };
  } catch (error) {
    try {
      getBackupLogSheet().appendRow([
        new Date(),
        getMonthlyBackupPeriod(new Date()),
        "",
        "",
        "",
        "FAILED: " + String(error && error.message ? error.message : error),
        force ? "MANUAL" : "AUTO",
      ]);
    } catch (ignoreLog) {}
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function installMonthlyBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === MONTHLY_BACKUP_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  const trigger = ScriptApp.newTrigger(MONTHLY_BACKUP_HANDLER)
    .timeBased()
    .onMonthDay(1)
    .atHour(2)
    .inTimezone(Session.getScriptTimeZone())
    .create();

  PropertiesService.getScriptProperties().setProperty(
    "MONTHLY_BACKUP_TRIGGER_ID",
    trigger.getUniqueId()
  );
  return {
    status: "success",
    triggerId: trigger.getUniqueId(),
    schedule: "Tanggal 1 setiap bulan, pukul 02:00",
    timezone: Session.getScriptTimeZone(),
    message: "Trigger backup bulanan berhasil diaktifkan",
  };
}

function getMonthlyBackupStatus() {
  const properties = PropertiesService.getScriptProperties();
  const activeTrigger = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === MONTHLY_BACKUP_HANDLER;
  });
  const lastFileId = properties.getProperty("MONTHLY_BACKUP_LAST_FILE_ID") || "";
  let backupUrl = "";
  if (lastFileId) {
    try {
      backupUrl = DriveApp.getFileById(lastFileId).getUrl();
    } catch (ignore) {}
  }
  return {
    status: "success",
    enabled: activeTrigger,
    schedule: "Tanggal 1 setiap bulan, pukul 02:00",
    timezone: Session.getScriptTimeZone(),
    lastPeriod: properties.getProperty("MONTHLY_BACKUP_LAST_PERIOD") || "",
    lastBackupAt: properties.getProperty("MONTHLY_BACKUP_LAST_AT") || "",
    lastFileId: lastFileId,
    backupUrl: backupUrl,
  };
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

function ensureBarcodeAliasSheet() {
  const sheet = getOrCreateSheet(BARCODE_ALIAS_SHEET);
  ensureHeaderRow(sheet, BARCODE_ALIAS_HEADERS);
  sheet.getRange(1, 1, 1, BARCODE_ALIAS_HEADERS.length)
    .setValues([BARCODE_ALIAS_HEADERS])
    .setBackground("#0f766e")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.getRange("H:I").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  return sheet;
}

function normalizeBarcodeAlias(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function listBarcodeAliases(params) {
  const sheet = ensureBarcodeAliasSheet();
  const rows = sheet.getDataRange().getValues();
  const raw = normalizeBarcodeAlias(params && params.raw);
  const data = rows.slice(1).map(function (row, index) {
    const item = { Row: index + 2 };
    BARCODE_ALIAS_HEADERS.forEach(function (header, column) {
      item[header] = row[column] === undefined ? "" : row[column];
    });
    return item;
  }).filter(function (item) {
    return String(item.RawCode || "").trim() &&
      (!raw || normalizeBarcodeAlias(item.RawCode) === raw);
  });
  return { status: "success", found: data.length > 0, data: data };
}

function upsertBarcodeAlias(payload) {
  const rawCode = String(payload.RawCode || payload.raw || "").trim();
  const ref = String(payload.Ref || payload.ref || "").trim();
  const lot = String(payload.Lot || payload.lot || "").trim();
  const stockSheetName = String(payload.StockSheet || payload.sheet || DEFAULT_SHEET).trim();
  if (!rawCode || !ref || !lot) {
    return { status: "error", message: "Barcode, REF, dan LOT wajib diisi" };
  }

  const stockSheet = getApplicationSpreadsheet().getSheetByName(stockSheetName);
  if (!stockSheet) return { status: "error", message: "Sheet stok tidak ditemukan" };
  const stockRows = stockSheet.getDataRange().getValues();
  const matches = [];
  for (var index = 1; index < stockRows.length; index++) {
    if (normalizeBranchIdentity(stockRows[index][0]) === normalizeBranchIdentity(ref) &&
        normalizeBranchIdentity(stockRows[index][4]) === normalizeBranchIdentity(lot)) {
      matches.push(stockRows[index]);
    }
  }
  if (matches.length !== 1) {
    return {
      status: "error",
      message: matches.length > 1
        ? "REF dan LOT ganda; rapikan data sebelum mengajarkan barcode"
        : "REF dan LOT tidak ditemukan pada stok"
    };
  }

  const stock = matches[0];
  const aliasSheet = ensureBarcodeAliasSheet();
  const aliasRows = aliasSheet.getDataRange().getValues();
  const key = normalizeBarcodeAlias(rawCode);
  let targetRow = 0;
  for (var aliasIndex = 1; aliasIndex < aliasRows.length; aliasIndex++) {
    if (normalizeBarcodeAlias(aliasRows[aliasIndex][0]) === key) {
      targetRow = aliasIndex + 1;
      break;
    }
  }
  const now = new Date();
  const actor = String(payload.By || Session.getActiveUser().getEmail() || "User");
  const createdAt = targetRow ? aliasSheet.getRange(targetRow, 8).getValue() || now : now;
  const values = [[
    rawCode, String(stock[0] || ref), String(stock[4] || lot),
    String(stock[3] || ""), String(stock[2] || ""), String(stock[1] || ""),
    stockSheetName, createdAt, now, actor
  ]];
  if (targetRow) aliasSheet.getRange(targetRow, 1, 1, BARCODE_ALIAS_HEADERS.length).setValues(values);
  else aliasSheet.appendRow(values[0]);
  return { status: "success", message: "Barcode berhasil dikenali", data: listBarcodeAliases({ raw: rawCode }).data[0] };
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
            "historyDelete",
            "scanLookup",
            "kpi",
            "setupSheet",
          ],
          externalSheet: ["importExternal"],
          handover: [
            "handoverList",
            "handoverSave",
            "handoverAccept",
            "handoverSettle",
            "handoverSupplement",
            "handoverDelete",
          ],
          reporting: [
            "backup",
            "monthlyBackup",
            "monthlyBackupSetup",
            "monthlyBackupStatus",
            "pdf",
          ],
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
    if (action === "handoverPublic") return cors(getPublicHandover(req.parameter));
    if (action === "branchTransferList") return cors(listBranchTransfers(req.parameter));
    if (action === "inventoryLocationList") return cors(listInventoryLocations(req.parameter));
    if (action === "barcodeAliasLookup" || action === "barcodeAliasList") {
      return cors(listBarcodeAliases(req.parameter));
    }
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
    if (action === "monthlyBackupStatus") return cors(getMonthlyBackupStatus());
    if (action === "pdf") return cors(exportPdf(sheetName));

    // GET harus read-only. Normalisasi header dan sinkronisasi TotalQty
    // dilakukan saat setup/mutasi agar pembacaan dashboard tetap cepat.
    const sheet = resolveDataSheet(req.parameter);
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
    if (payload.action === "monthlyBackupSetup") {
      return cors(installMonthlyBackupTrigger());
    }
    if (payload.action === "monthlyBackup") {
      return cors(autoBackupMonthly(Boolean(payload.force)));
    }
    if (payload.action === "importExternal") return cors(importExternalSheet(payload));
    if (payload.action === "importStockExcel") return cors(importStockExcelBatch(payload));
    if (payload.action === "customerBulkImport") return cors(bulkImportCustomers(payload));
    if (payload.action === "customerDecision") return cors(updateCustomerDecision(payload));
    if (payload.action === "customerUpsert") return cors(upsertCustomer(payload));
    if (payload.action === "customerDelete") return cors(deleteCustomer(payload));
    if (payload.action === "customerJourney") return cors(advanceCustomerJourney(payload));
    if (payload.action === "warningUpdate") return cors(updateStockWarningWorkflow(payload));
    if (payload.action === "warningQuickAction") return cors(quickUpdateStockWarning(payload));
    if (payload.action === "historyDelete") return cors(deleteHistoryRows(payload));
    if (payload.action === "handoverSave") return cors(saveHandover(payload));
    if (payload.action === "handoverDelete") return cors(deleteHandovers(payload));
    if (payload.action === "handoverAccept") return cors(acceptHandover(payload));
    if (payload.action === "handoverSupplement") {
      return cors(appendHandoverSupplement(payload));
    }
    if (payload.action === "handoverSettle") {
      return cors(settleHandoverInventory(payload));
    }
    if (payload.action === "branchTransferSave") {
      return cors(saveBranchTransfer(payload));
    }
    if (payload.action === "branchTransferCorrect") {
      return cors(correctBranchTransfer(payload));
    }
    if (payload.action === "inventoryLocationSync") {
      return cors(syncOfficeInventoryLocations());
    }
    if (payload.action === "stockOpnamePost") {
      return cors(postStockOpname(payload));
    }
    if (payload.action === "inventoryConditionPost") {
      return cors(postInventoryCondition(payload));
    }
    if (payload.action === "barcodeAliasUpsert") return cors(upsertBarcodeAlias(payload));
    if (payload.methodOverride === "PUT") return cors(handleUpdate(payload));
    if (payload.methodOverride === "DELETE") return cors(handleDelete(payload));
    if (payload.action === "mutasi") return cors(handleMutasi(payload));
    if (payload.action === "duplicate") return cors(handleDuplicate(payload));

    return cors(handleCreate(payload));
  } catch (err) {
    return cors({ status: "error", message: err.message });
  }
}
