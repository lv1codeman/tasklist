const SHEET_ID = "1AddWwoizYJDqv7lluelwkke0KFKv-voxvWFVHiMn9no";
const SHEET_NAME = "tasklist";

/* ✅ GET */
function doGet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];

  const rows = data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });

  return json({ headers, rows });
}

/* ✅ POST */
function doPost(e) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.parameter.payload);

  const all = sheet.getDataRange().getValues();
  const headers = all[0];

  const idIndex = headers.indexOf("id");
  const orderIndex = headers.indexOf("order");

  /* ✅ 統一資料格式 */
  const normalize = (data) => {
    if (data.done !== undefined) {
      data.done =
        data.done === "1" || data.done === 1 || data.done === true ? "1" : "0";
    }

    if (data.order !== undefined) {
      data.order = Number(data.order);
    }

    return data;
  };

  /* ✅ ADD */
  if (body.action === "add") {
    let data = normalize(body.data);

    if (!data.id) {
      data.id = Date.now().toString();
    }

    if (!data.order) {
      data.order = Date.now();
    }

    const row = headers.map((h) => data[h] ?? "");

    sheet.appendRow(row);
  }

  /* ✅ ✅ ✅ ✅ UPDATE（用 id 找） ✅ */
  if (body.action === "update") {
    let data = normalize(body.data);

    for (let i = 1; i < all.length; i++) {
      if (all[i][idIndex] == data.id) {
        const row = headers.map((h) => data[h] ?? "");

        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);

        break;
      }
    }
  }

  /* ✅ ✅ ✅ ✅ ✅ BATCH UPDATE（只更新 order） ✅ */
  if (body.action === "batchUpdate") {
    const orderMap = {};

    body.data.forEach((item) => {
      orderMap[item.id] = Number(item.order);
    });

    for (let i = 1; i < all.length; i++) {
      const id = all[i][idIndex];

      if (orderMap[id] !== undefined) {
        sheet.getRange(i + 1, orderIndex + 1).setValue(orderMap[id]);
      }
    }
  }

  /* ✅ ✅ ✅ ✅ DELETE（用 id） ✅ */
  if (body.action === "delete") {
    const id = body.data.id;

    for (let i = 1; i < all.length; i++) {
      if (all[i][idIndex] == id) {
        sheet.deleteRow(i + 1);

        break;
      }
    }
  }

  return json({ success: true });
}

/* ✅ 回傳 JSON */
function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
