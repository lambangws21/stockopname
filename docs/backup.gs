const DEFAULT_SHEET = "Sheet1";
const LOW_STOCK_THRESHOLD = 1;

const ADMIN_EMAILS = ["lambangws21@gmail.com"];
const BACKUP_FOLDER_ID = "1_y8hc--3PdA-_t07lW1p_TO7VDuSky47";
const EXTERNAL_SOURCE_URL_DEFAULT =
  "https://docs.google.com/spreadsheets/d/1yHHodOG94Fz7ugN2Qvom3l6ouulr3vIjiBfcejTUXoM/edit?gid=505336972#gid=505336972";
const EXTERNAL_SOURCE_GID_DEFAULT = "505336972";
const EXTERNAL_TARGET_SHEET_DEFAULT = "ExternalImport";
const CUSTOMER_SHEET = "CustomerMapping";
const CUSTOMER_HISTORY_SHEET = "CustomerHistory";
const CUSTOMER_USAGE_SHEET = "CustomerUsageHistory";
const DOCTOR_PHOTO_FOLDER_ID = "1_y8hc--3PdA-_t07lW1p_TO7VDuSky47";

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
  "No",
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

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActive();
  const sheetName = String(name || "").trim() || DEFAULT_SHEET;
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
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);
  if (sheet) return sheet;

  if (name === "History") {
    sheet = ss.insertSheet("History");
    sheet.appendRow(["Timestamp", "Action", "Sheet", "No", "Changes", "By"]);
    return sheet;
  }

  throw new Error("Sheet not found: " + name);
}

function normalizeSheet(sheet) {
  if (!sheet) throw new Error("Sheet is required");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(MASTER_HEADERS);
    return;
  }

  const existingHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];

  // Migrasi aman dari format 9 kolom: sisipkan Implant dan Brand,
  // sehingga data Batch/Qty lama tidak tertimpa atau bergeser salah.
  if (
    existingHeaders[0] === "No" &&
    existingHeaders[1] === "NoStok" &&
    existingHeaders[2] === "Deskripsi" &&
    existingHeaders[3] === "Batch"
  ) {
    sheet.insertColumnsAfter(3, 2);
  }

  const current = sheet.getRange(1, 1, 1, MASTER_HEADERS.length).getValues()[0];
  const fixed = MASTER_HEADERS.map(function (h, i) {
    return current[i] === h ? current[i] : h;
  });
  sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([fixed]);
}

function autoNumber(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return 1;
  return safeNumber(sheet.getRange(last, 1).getValue()) + 1;
}

function rowArrayToObject(row) {
  const obj = {};
  for (var i = 0; i < MASTER_HEADERS.length; i++) {
    obj[MASTER_HEADERS[i]] = row[i];
  }
  return obj;
}

function parseRows(rows) {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter(function (row) {
      return row.some(function (c) {
        return String(c).trim() !== "";
      });
    })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) {
        obj[h] = row[i];
      });
      return obj;
    });
}

function syncTotalQty(sheet) {
  const rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    const qty = safeNumber(rows[i][6]);
    const used = safeNumber(rows[i][8]);
    const refill = safeNumber(rows[i][9]);
    const total = qty + refill - used;

    if (safeNumber(rows[i][7]) !== total) {
      sheet.getRange(i + 1, 8).setValue(total);
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
    const noStok = rows[i][1];
    const totalQty = safeNumber(rows[i][7]);

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

  const no = autoNumber(sheet);
  const row = [
    no,
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

  row[7] = safeNumber(row[6]) + safeNumber(row[9]) - safeNumber(row[8]);
  sheet.appendRow(row);

  logHistory("CREATE", sheet.getName(), no, {}, rowArrayToObject(row), payload.by);
  return { status: "success", No: no };
}

function handleUpdate(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  normalizeSheet(sheet);

  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);
  const idx = rows.findIndex(function (r) {
    return safeNumber(r[0]) === no;
  });

  if (idx < 1) return { status: "error", message: "No not found" };

  const beforeRow = rows[idx];
  const before = rowArrayToObject(beforeRow);

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
    no,
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
  updated[7] = safeNumber(updated[6]) + safeNumber(updated[9]) - safeNumber(updated[8]);

  sheet.getRange(idx + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  const after = rowArrayToObject(updated);

  logHistory("UPDATE", sheet.getName(), no, before, after, payload.by);
  return { status: "success" };
}

function handleDelete(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);

  const idx = rows.findIndex(function (r) {
    return safeNumber(r[0]) === no;
  });
  if (idx < 1) return { status: "error", message: "Not found" };

  const before = rowArrayToObject(rows[idx]);
  sheet.deleteRow(idx + 1);
  logHistory("DELETE", sheet.getName(), no, before, {}, payload.by);

  return { status: "success" };
}

function handleMutasi(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  normalizeSheet(sheet);

  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);
  const qty = safeNumber(payload.qty);

  if (qty <= 0) return { status: "error", message: "Qty harus > 0" };

  const idx = rows.findIndex(function (r) {
    return safeNumber(r[0]) === no;
  });
  if (idx < 1) return { status: "error", message: "Not found" };

  const old = rows[idx];
  const before = rowArrayToObject(old);
  const type = String(payload.type || "").toLowerCase();

  const baseQty = safeNumber(old[6]);
  let used = safeNumber(old[8]);
  let refill = safeNumber(old[9]);
  const totalBefore = baseQty + refill - used;

  if (type === "in") {
    refill += qty;
  } else if (type === "out") {
    if (totalBefore < qty) {
      return { status: "error", message: "Stock not enough" };
    }
    used += qty;
  } else {
    return { status: "error", message: "Invalid mutasi type" };
  }

  const updated = old.slice();
  updated[6] = baseQty;
  updated[8] = used;
  updated[9] = refill;
  updated[7] = baseQty + refill - used;

  sheet.getRange(idx + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  logHistory(
    "MUTASI_" + type.toUpperCase(),
    sheet.getName(),
    no,
    before,
    rowArrayToObject(updated),
    payload.by
  );

  return { status: "success", No: no, newQty: safeNumber(updated[7]) };
}

function handleDuplicate(body) {
  const payload = body || {};
  const sheet = resolveDataSheet(payload);
  const rows = sheet.getDataRange().getValues();
  const targetNo = safeNumber(payload.No);

  const idx = rows.findIndex(function (r) {
    return safeNumber(r[0]) === targetNo;
  });
  if (idx < 1) return { status: "error", message: "Not found" };

  const newNo = autoNumber(sheet);
  const source = rows[idx].slice();
  const newRow = source.slice();
  newRow[0] = newNo;
  sheet.appendRow(newRow);

  logHistory(
    "DUPLICATE",
    sheet.getName(),
    newNo,
    rowArrayToObject(source),
    rowArrayToObject(newRow),
    payload.by
  );

  return { status: "success", No: newNo };
}

function autoBackupDaily() {
  if (!BACKUP_FOLDER_ID || BACKUP_FOLDER_ID === "YOUR_BACKUP_FOLDER_ID") {
    return "BACKUP_FOLDER_ID belum diisi";
  }

  const ss = SpreadsheetApp.getActive();
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
  const ss = SpreadsheetApp.getActive();
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
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "CustomerID", "Action", "Before", "After", "By"]);
    sheet.setFrozenRows(1);
  }
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

    if (action === "history") return cors(getHistory(req));
    if (action === "customerCapabilities") {
      return cors({
        status: "success",
        module: "CustomerMapping",
        version: 10,
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

    if (payload.action === "importExternal") return cors(importExternalSheet(payload));
    if (payload.action === "customerBulkImport") return cors(bulkImportCustomers(payload));
    if (payload.action === "customerDecision") return cors(updateCustomerDecision(payload));
    if (payload.action === "customerUpsert") return cors(upsertCustomer(payload));
    if (payload.action === "customerDelete") return cors(deleteCustomer(payload));
    if (payload.action === "customerJourney") return cors(advanceCustomerJourney(payload));
    if (payload.methodOverride === "PUT") return cors(handleUpdate(payload));
    if (payload.methodOverride === "DELETE") return cors(handleDelete(payload));
    if (payload.action === "mutasi") return cors(handleMutasi(payload));
    if (payload.action === "duplicate") return cors(handleDuplicate(payload));

    return cors(handleCreate(payload));
  } catch (err) {
    return cors({ status: "error", message: err.message });
  }
}
