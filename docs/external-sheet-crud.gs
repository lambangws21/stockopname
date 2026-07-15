const TARGET_SPREADSHEET_ID = "1yHHodOG94Fz7ugN2Qvom3l6ouulr3vIjiBfcejTUXoM";
const TARGET_SHEET_GID = 505336972;
const DEFAULT_TARGET_SHEET_NAME = "Sheet1";
const HISTORY_SHEET_NAME = "History";
const LOW_STOCK_THRESHOLD = 1;

const MASTER_HEADERS = [
  "No",
  "NoStok",
  "Deskripsi",
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
  if (typeof value === "number") return isNaN(value) ? 0 : value;
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

function getTargetSpreadsheet() {
  return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
}

function getTargetSheet() {
  const ss = getTargetSpreadsheet();
  let sheet = null;
  const sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === TARGET_SHEET_GID) {
      sheet = sheets[i];
      break;
    }
  }

  if (!sheet) {
    sheet = ss.getSheetByName(DEFAULT_TARGET_SHEET_NAME);
  }

  if (!sheet) {
    sheet = sheets.length ? sheets[0] : ss.insertSheet(DEFAULT_TARGET_SHEET_NAME);
  }

  return sheet;
}

function getHistorySheet() {
  const ss = getTargetSpreadsheet();
  let hist = ss.getSheetByName(HISTORY_SHEET_NAME);

  if (!hist) {
    hist = ss.insertSheet(HISTORY_SHEET_NAME);
    hist.appendRow(["Timestamp", "Action", "Sheet", "No", "Changes", "By"]);
  }

  return hist;
}

function normalizeSheet(sheet) {
  if (!sheet) throw new Error("Sheet is required");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(MASTER_HEADERS);
    return;
  }

  const current = sheet.getRange(1, 1, 1, MASTER_HEADERS.length).getValues()[0];
  const fixed = MASTER_HEADERS.map(function (h, i) {
    return current[i] === h ? current[i] : h;
  });
  sheet.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([fixed]);
}

function parseRows(rows) {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter(function (row) {
      return row.some(function (cell) {
        return String(cell).trim() !== "";
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

function rowArrayToObject(row) {
  const obj = {};
  for (var i = 0; i < MASTER_HEADERS.length; i++) {
    obj[MASTER_HEADERS[i]] = row[i];
  }
  return obj;
}

function syncTotalQty(sheet) {
  const rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    const qty = safeNumber(rows[i][4]);
    const used = safeNumber(rows[i][6]);
    const refill = safeNumber(rows[i][7]);
    const total = qty + refill - used;
    if (safeNumber(rows[i][5]) !== total) {
      sheet.getRange(i + 1, 6).setValue(total);
    }
  }
}

function autoNumber(sheet) {
  const rows = sheet.getDataRange().getValues();
  let maxNo = 0;

  for (var i = 1; i < rows.length; i++) {
    const n = safeNumber(rows[i][0]);
    if (n > maxNo) maxNo = n;
  }

  return maxNo + 1;
}

function logHistory(action, sheetName, no, beforeObj, afterObj, by) {
  try {
    const hist = getHistorySheet();
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

  const refRaw = req.parameter.ref || "";
  const lotRaw = req.parameter.lot || "";
  const refToken = normalizeToken(refRaw);
  const lotToken = normalizeToken(lotRaw);

  if (!refToken) {
    return { status: "error", message: "Missing ref for scanLookup" };
  }

  const sheet = getTargetSheet();
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
    query: { ref: refRaw, lot: lotRaw },
  };
}

function getHistory(e) {
  const req = e || {};
  req.parameter = req.parameter || {};

  const hist = getHistorySheet();
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

  const targetNo = safeNumber(req.parameter.No);
  const currentSheetName = getTargetSheet().getName();

  const data = rows
    .slice(1)
    .filter(function (r) {
      if (r[idx.Sheet] !== currentSheetName) return false;
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

function generateKPI() {
  const sheet = getTargetSheet();
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return { totalItems: 0, lowStock: 0, sumStock: 0 };
  }

  let totalItems = 0;
  let lowStock = 0;
  let sumStock = 0;

  for (var i = 1; i < rows.length; i++) {
    const noStok = rows[i][1];
    const totalQty = safeNumber(rows[i][5]);

    if (String(noStok).trim()) totalItems++;
    sumStock += totalQty;
    if (totalQty <= LOW_STOCK_THRESHOLD) lowStock++;
  }

  return { totalItems: totalItems, lowStock: lowStock, sumStock: sumStock };
}

function handleCreate(body) {
  const payload = body || {};
  const sheet = getTargetSheet();
  normalizeSheet(sheet);

  const no = autoNumber(sheet);
  const row = [
    no,
    payload.NoStok || "",
    payload.Deskripsi || "",
    payload.Batch || "",
    safeNumber(payload.Qty),
    0,
    safeNumber(payload.TERPAKAI),
    safeNumber(payload.REFILL),
    payload.KET || "",
  ];

  row[5] = safeNumber(row[4]) + safeNumber(row[7]) - safeNumber(row[6]);
  sheet.appendRow(row);

  logHistory("CREATE", sheet.getName(), no, {}, rowArrayToObject(row), payload.by);
  return { status: "success", No: no };
}

function handleUpdate(body) {
  const payload = body || {};
  const sheet = getTargetSheet();
  normalizeSheet(sheet);

  const rows = sheet.getDataRange().getValues();
  const no = safeNumber(payload.No);
  const idx = rows.findIndex(function (r) {
    return safeNumber(r[0]) === no;
  });

  if (idx < 1) return { status: "error", message: "No not found" };

  const before = rowArrayToObject(rows[idx]);
  const updated = [
    no,
    hasOwn(payload, "NoStok") ? payload.NoStok : before.NoStok,
    hasOwn(payload, "Deskripsi") ? payload.Deskripsi : before.Deskripsi,
    hasOwn(payload, "Batch") ? payload.Batch : before.Batch,
    safeNumber(hasOwn(payload, "Qty") ? payload.Qty : before.Qty),
    0,
    safeNumber(hasOwn(payload, "TERPAKAI") ? payload.TERPAKAI : before.TERPAKAI),
    safeNumber(hasOwn(payload, "REFILL") ? payload.REFILL : before.REFILL),
    hasOwn(payload, "KET") ? payload.KET : before.KET,
  ];
  updated[5] = safeNumber(updated[4]) + safeNumber(updated[7]) - safeNumber(updated[6]);

  sheet.getRange(idx + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  logHistory("UPDATE", sheet.getName(), no, before, rowArrayToObject(updated), payload.by);
  return { status: "success" };
}

function handleDelete(body) {
  const payload = body || {};
  const sheet = getTargetSheet();
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
  const sheet = getTargetSheet();
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

  const baseQty = safeNumber(old[4]);
  let used = safeNumber(old[6]);
  let refill = safeNumber(old[7]);
  const totalBefore = baseQty + refill - used;

  if (type === "in") {
    refill += qty;
  } else if (type === "out") {
    if (totalBefore < qty) return { status: "error", message: "Stock not enough" };
    used += qty;
  } else {
    return { status: "error", message: "Invalid mutasi type" };
  }

  const updated = old.slice();
  updated[6] = used;
  updated[7] = refill;
  updated[5] = baseQty + refill - used;

  sheet.getRange(idx + 1, 1, 1, MASTER_HEADERS.length).setValues([updated]);
  logHistory(
    "MUTASI_" + type.toUpperCase(),
    sheet.getName(),
    no,
    before,
    rowArrayToObject(updated),
    payload.by
  );

  return { status: "success", No: no, newQty: safeNumber(updated[5]) };
}

function handleDuplicate(body) {
  const payload = body || {};
  const sheet = getTargetSheet();
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

function doGet(e) {
  try {
    const req = e || {};
    req.parameter = req.parameter || {};
    const action = req.parameter.action || "";

    if (action === "history") return cors(getHistory(req));
    if (action === "scanLookup") return cors(scanLookup(req));
    if (action === "kpi") return cors({ status: "success", kpi: generateKPI() });

    const sheet = getTargetSheet();
    normalizeSheet(sheet);
    syncTotalQty(sheet);

    return cors({
      status: "success",
      sheet: sheet.getName(),
      data: parseRows(sheet.getDataRange().getValues()),
    });
  } catch (err) {
    return cors({ status: "error", message: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.methodOverride === "PUT") return cors(handleUpdate(payload));
    if (payload.methodOverride === "DELETE") return cors(handleDelete(payload));
    if (payload.action === "mutasi") return cors(handleMutasi(payload));
    if (payload.action === "duplicate") return cors(handleDuplicate(payload));

    return cors(handleCreate(payload));
  } catch (err) {
    return cors({ status: "error", message: err.message });
  }
}
