(function() {

function OnAddinLoad(ribbonUI) {
  try {
    if (typeof wps !== "undefined" && wps && wps.PluginStorage) {
      var G = getGlobalObj();
      G.__wpsfa_llm_base_url = wps.PluginStorage.getItem("llm_base_url") || "";
      G.__wpsfa_llm_api_key = wps.PluginStorage.getItem("llm_api_key") || "";
    }
  } catch (_) {}
  try {
    if (typeof console !== "undefined" && console && console.log) {
      console.log("SheetKit Loaded");
    }
  } catch (_) {}
  return true;
}

function addRound(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到 WPS 表格应用对象（EtApplication）。");
    return true;
  }
  var selection = app.Selection;
  if (!selection) {
    showMsg("未获取到当前选区。");
    return true;
  }
  applyRoundToSelection(app, selection, 2);
  return true;
}

function addRoundWithDigits(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到 WPS 表格应用对象（EtApplication）。");
    return true;
  }
  var selection = app.Selection;
  if (!selection) {
    showMsg("未获取到当前选区。");
    return true;
  }
  var id = control.Id;
  var digits = 2;
  var m = /D(\d+)$/.exec(id);
  if (m) {
    digits = parseInt(m[1], 10);
    if (isNaN(digits) || digits < 0 || digits > 10) {
      digits = 2;
    }
  }
  applyRoundToSelection(app, selection, digits);
  return true;
}

function addRoundCustom(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到 WPS 表格应用对象（EtApplication）。");
    return true;
  }
  var selection = app.Selection;
  if (!selection) {
    showMsg("未获取到当前选区。");
    return true;
  }
  var input = app.InputBox("请输入小数位数（0-10 的整数）：", "自定义精度", "2", undefined, undefined, undefined, undefined, 1);
  if (input === false) return true;
  var digits = parseInt(input, 10);
  if (isNaN(digits) || digits < 0 || digits > 10) {
    showMsg("请输入 0-10 之间的整数。");
    return true;
  }
  applyRoundToSelection(app, selection, digits);
  return true;
}

function removeRound(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到 WPS 表格应用对象（EtApplication）。");
    return true;
  }
  var selection = app.Selection;
  if (!selection) {
    showMsg("未获取到当前选区。");
    return true;
  }
  removeRoundFromSelection(app, selection);
  return true;
}

function toggleSign(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到 WPS 表格应用对象（EtApplication）。");
    return true;
  }
  var selection = app.Selection;
  if (!selection) {
    showMsg("未获取到当前选区。");
    return true;
  }
  var prevUpdating = app.ScreenUpdating;
  app.ScreenUpdating = false;
  try {
    var areas = getAreas(selection);
    for (var a = 0; a < areas.length; a++) {
      applyToggleSignToRange(areas[a]);
    }
  } catch (e) {
    showMsg("正负转换失败：" + (e && e.message ? e.message : String(e)));
  } finally {
    app.ScreenUpdating = prevUpdating;
  }
  return true;
}

function showSettings(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到应用对象");
    return true;
  }
  var G = getGlobalObj();
  var currentUrl = G.__wpsfa_llm_base_url || "";
  var currentKey = G.__wpsfa_llm_api_key || "";
  var url = app.InputBox("请输入 LLM API Base URL：\n（兼容 OpenAI 格式，如 https://api.openai.com/v1）\n\n当前: " + (currentUrl || "未设置"), "LLM 设置", currentUrl || "https://api.openai.com/v1");
  if (url === false) return true;
  var key = app.InputBox("请输入 API Key：\n\n当前: " + (currentKey ? currentKey.slice(0, 8) + "..." : "未设置"), "LLM 设置", "");
  if (key === false) return true;
  G.__wpsfa_llm_base_url = String(url).trim();
  G.__wpsfa_llm_api_key = String(key).trim();
  try {
    if (typeof wps !== "undefined" && wps && wps.PluginStorage) {
      wps.PluginStorage.setItem("llm_base_url", G.__wpsfa_llm_base_url);
      wps.PluginStorage.setItem("llm_api_key", G.__wpsfa_llm_api_key);
    }
  } catch (_) {}
  showMsg("LLM 设置已保存");
  return true;
}

function roundValue(control) {
  var app = getEtApp();
  if (!app) {
    showMsg("未获取到 WPS 表格应用对象（EtApplication）。");
    return true;
  }
  var selection = app.Selection;
  if (!selection) {
    showMsg("未获取到当前选区。");
    return true;
  }
  var input = app.InputBox("请输入小数位数（0-10 的整数）：", "直接四舍五入", "2", undefined, undefined, undefined, undefined, 1);
  if (input === false) return true;
  var digits = parseInt(input, 10);
  if (isNaN(digits) || digits < 0 || digits > 10) {
    showMsg("请输入 0-10 之间的整数。");
    return true;
  }
  applyRoundValueToSelection(app, selection, digits);
  return true;
}

function copyAsMarkdown(control) {
  var app = getEtApp();
  if (!app) { showMsg("未获取到 WPS 表格应用对象"); return true; }
  var selection = app.Selection;
  if (!selection) { showMsg("未获取到当前选区"); return true; }

  var area = getFirstArea(selection);
  var sheet = app.ActiveSheet;

  var minRow = area.Row;
  var maxRow = minRow + area.Rows.Count - 1;
  var minCol = area.Column;
  var maxCol = minCol + area.Columns.Count - 1;

  var visibleRows = getVisibleRows(sheet, minRow, maxRow);
  var visibleCols = getVisibleCols(sheet, minCol, maxCol);
  if (visibleRows.length === 0 || visibleCols.length === 0) {
    showMsg("选区无可见数据");
    return true;
  }

  var rowsData = [];
  for (var ri = 0; ri < visibleRows.length; ri++) {
    var row = [];
    for (var ci = 0; ci < visibleCols.length; ci++) {
      var text = getMergedCellText(sheet, visibleRows[ri], visibleCols[ci]);
      text = text.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/\r/g, "");
      row.push(text);
    }
    rowsData.push(row);
  }

  var headerRows = detectHeaderRows(app, sheet, visibleRows, visibleCols, rowsData);

  var md = "";
  for (var i = 0; i < rowsData.length; i++) {
    md += "| " + rowsData[i].join(" | ") + " |\n";
    if (i === headerRows - 1) {
      md += "| " + rowsData[i].map(function() { return "---"; }).join(" | ") + " |\n";
    }
  }

  copyTextToClipboard(md);
  showMsg("已复制 " + visibleRows.length + " 行 x " + visibleCols.length + " 列 Markdown 表格");
  return true;
}

function getFirstArea(selection) {
  try {
    if (selection.Areas && selection.Areas.Count) {
      return selection.Areas.Item(1);
    }
  } catch (_) {}
  return selection;
}

function getVisibleRows(sheet, minRow, maxRow) {
  var visible = [];
  for (var r = minRow; r <= maxRow; r++) {
    try {
      if (!sheet.Rows.Item(r).Hidden) visible.push(r);
    } catch (_) { visible.push(r); }
  }
  return visible;
}

function getVisibleCols(sheet, minCol, maxCol) {
  var visible = [];
  for (var c = minCol; c <= maxCol; c++) {
    try {
      if (!sheet.Columns.Item(c).Hidden) visible.push(c);
    } catch (_) { visible.push(c); }
  }
  return visible;
}

function getMergedCellText(sheet, row, col) {
  var cell = sheet.Cells.Item(row, col);
  try {
    if (cell.MergeCells) {
      var mergeArea = cell.MergeArea;
      if (mergeArea.Row === row && mergeArea.Column === col) {
        return getCellDisplayText(cell);
      }
      return "";
    }
  } catch (_) {}
  return getCellDisplayText(cell);
}

function getCellDisplayText(cell) {
  var text = "";
  try { text = String(cell.Text || ""); } catch (_) {}
  if (!text) {
    try {
      var v = cell.Value2;
      text = (v !== null && v !== undefined) ? String(v) : "";
    } catch (_) {}
  }
  return text;
}

function detectHeaderRows(app, sheet, visibleRows, visibleCols, rowsData) {
  var freezeRows = detectFreezeRows(app);
  if (freezeRows > 0 && freezeRows <= visibleRows.length) return freezeRows;

  var mergeHeaderRows = detectMergeHeaderRows(sheet, visibleRows, visibleCols);
  if (mergeHeaderRows > 0) return mergeHeaderRows;

  var textHeaderRows = detectTextHeaderRows(rowsData);
  if (textHeaderRows > 0) return textHeaderRows;

  var llmResult = detectHeaderRowsWithLLM(rowsData, 10);
  if (llmResult > 0) return llmResult;

  return 1;
}

function detectFreezeRows(app) {
  try {
    if (app.ActiveWindow && typeof app.ActiveWindow.SplitRow !== "undefined") {
      return app.ActiveWindow.SplitRow;
    }
  } catch (_) {}
  return 0;
}

function detectMergeHeaderRows(sheet, visibleRows, visibleCols) {
  var maxCheck = Math.min(3, visibleRows.length);
  var headerRowCount = 0;
  for (var ri = 0; ri < maxCheck; ri++) {
    var hasMerge = false;
    for (var ci = 0; ci < visibleCols.length; ci++) {
      try {
        var cell = sheet.Cells.Item(visibleRows[ri], visibleCols[ci]);
        if (cell.MergeCells) {
          var mergeArea = cell.MergeArea;
          if (mergeArea.Columns.Count > 1) {
            hasMerge = true;
            break;
          }
        }
      } catch (_) {}
    }
    if (hasMerge) {
      headerRowCount = ri + 1;
    } else {
      break;
    }
  }
  return headerRowCount;
}

function detectTextHeaderRows(rowsData) {
  var headerRowCount = 0;
  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (row.length === 0) break;
    var numCount = 0;
    var totalCount = 0;
    for (var j = 0; j < row.length; j++) {
      var cell = row[j];
      if (cell === "") continue;
      totalCount++;
      if (/^-?\d+(\.\d+)?$/.test(cell.trim())) numCount++;
    }
    if (totalCount > 0 && numCount / totalCount > 0.5) break;
    if (i < rowsData.length - 1) headerRowCount = i + 1;
  }
  if (headerRowCount > 0) return headerRowCount;
  return 0;
}

function detectHeaderRowsWithLLM(rowsData, maxRows) {
  var G = getGlobalObj();
  var baseUrl = G.__wpsfa_llm_base_url;
  var apiKey = G.__wpsfa_llm_api_key;
  if (!baseUrl || !apiKey) return -1;

  var sample = "";
  var limit = Math.min(rowsData.length, maxRows || 10);
  for (var i = 0; i < limit; i++) {
    sample += "Row " + (i + 1) + ": " + rowsData[i].join(" | ") + "\n";
  }

  var prompt = "Below are the first rows of a spreadsheet table. Determine how many rows are header rows (column titles, not data). Reply with ONLY a single integer number.\n\n" + sample;

  try {
    var xhr = new XMLHttpRequest();
    var url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
    // 同步请求：WPS 加载项环境下异步 XHR 不可用，timeout 在同步模式下可能不生效
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + apiKey);
    xhr.timeout = 10000;

    var body = JSON.stringify({
      model: "auto",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0
    });

    xhr.send(body);

    if (xhr.status === 200) {
      var resp = JSON.parse(xhr.responseText);
      var answer = resp.choices[0].message.content.trim();
      var num = parseInt(answer, 10);
      if (num >= 1 && num <= limit) return num;
    }
  } catch (_) {}

  return -1;
}

function getEtApp() {
  try {
    if (typeof wps !== "undefined" && wps && typeof wps.EtApplication === "function") {
      return wps.EtApplication();
    }
  } catch (_) {}
  try {
    if (typeof Application !== "undefined" && Application) {
      return Application;
    }
  } catch (_) {}
  return null;
}

function applyRoundToSelection(app, selection, digits) {
  var prevUpdating = app.ScreenUpdating;
  app.ScreenUpdating = false;
  try {
    var areas = getAreas(selection);
    for (var a = 0; a < areas.length; a++) {
      applyRoundToRange(areas[a], digits);
    }
  } catch (e) {
    showMsg("添加Round失败：" + (e && e.message ? e.message : String(e)));
  } finally {
    app.ScreenUpdating = prevUpdating;
  }
}

function applyRoundToRange(area, digits) {
  var app = getEtApp();
  var usedRange = app.ActiveSheet.UsedRange;
  var effectiveRange = app.Intersect(area, usedRange);
  if (!effectiveRange) return;

  var rows = effectiveRange.Rows.Count;
  var cols = effectiveRange.Columns.Count;

  var formulas = effectiveRange.Formula;
  var values = effectiveRange.Value2;

  if (rows === 1 && cols === 1) {
    formulas = [[formulas]];
    values = [[values]];
  }

  var result = [];
  var changed = false;

  for (var r = 0; r < rows; r++) {
    result[r] = [];
    for (var c = 0; c < cols; c++) {
      var f = formulas[r][c];
      var v = values[r][c];

      if (v === null || v === "" || typeof v === "undefined") {
        result[r][c] = f;
        continue;
      }

      if (typeof f === "string" && f.charAt(0) === "=") {
        if (/^=\s*(?:_xlfn\.)?ROUND\s*\(/i.test(f)) {
          result[r][c] = f;
          continue;
        }
        var inner = f.replace(/^=\s*/, "");
        result[r][c] = "=ROUND(" + inner + ", " + digits + ")";
        changed = true;
        continue;
      }

      var numText = normalizeNumberText(v);
      if (numText) {
        result[r][c] = "=ROUND(" + numText + ", " + digits + ")";
        changed = true;
      } else {
        result[r][c] = f;
      }
    }
  }

  if (changed) {
    effectiveRange.Formula = result;
  }
}

function removeRoundFromSelection(app, selection) {
  var prevUpdating = app.ScreenUpdating;
  app.ScreenUpdating = false;
  try {
    var areas = getAreas(selection);
    for (var a = 0; a < areas.length; a++) {
      applyRemoveRoundToRange(areas[a]);
    }
  } catch (e) {
    showMsg("移除Round失败：" + (e && e.message ? e.message : String(e)));
  } finally {
    app.ScreenUpdating = prevUpdating;
  }
}

function applyRoundValueToSelection(app, selection, digits) {
  var prevUpdating = app.ScreenUpdating;
  app.ScreenUpdating = false;
  try {
    var areas = getAreas(selection);
    for (var a = 0; a < areas.length; a++) {
      applyRoundValueToRange(areas[a], digits);
    }
  } catch (e) {
    showMsg("四舍五入失败：" + (e && e.message ? e.message : String(e)));
  } finally {
    app.ScreenUpdating = prevUpdating;
  }
}

function applyRemoveRoundToRange(area) {
  var app = getEtApp();
  var usedRange = app.ActiveSheet.UsedRange;
  var effectiveRange = app.Intersect(area, usedRange);
  if (!effectiveRange) return;

  var rows = effectiveRange.Rows.Count;
  var cols = effectiveRange.Columns.Count;

  var formulas = effectiveRange.Formula;

  if (rows === 1 && cols === 1) {
    formulas = [[formulas]];
  }

  var result = [];
  var valueCells = [];
  var changed = false;

  for (var r = 0; r < rows; r++) {
    result[r] = [];
    for (var c = 0; c < cols; c++) {
      var f = formulas[r][c];

      if (typeof f !== "string" || f.charAt(0) !== "=") {
        result[r][c] = f;
        continue;
      }

      if (!/^=\s*(?:_xlfn\.)?ROUND\s*\(/i.test(f)) {
        result[r][c] = f;
        continue;
      }

      var parsed = extractOuterRoundArgs(f);
      if (!parsed) {
        result[r][c] = f;
        continue;
      }

      var normalizedInner = parsed.expr.replace(/^=\s*/, "").trim();
      if (!normalizedInner) {
        result[r][c] = f;
        continue;
      }

      if (isPureNumberExpr(normalizedInner)) {
        var num = parseFloat(normalizedInner);
        result[r][c] = "=" + normalizedInner;
        valueCells.push({ r: r, c: c, num: num, digits: parsed.digits });
        changed = true;
      } else {
        result[r][c] = "=" + normalizedInner;
        changed = true;
      }
    }
  }

  if (!changed) return;

  effectiveRange.Formula = result;

  for (var i = 0; i < valueCells.length; i++) {
    var vc = valueCells[i];
    var cell = effectiveRange.Cells.Item(vc.r + 1, vc.c + 1);
    var beforeFormat = safeGetCellNumberFormat(cell);

    var wrote = false;
    try {
      cell.Value2 = vc.num;
      wrote = true;
    } catch (_) {}
    if (!wrote) {
      try {
        cell.Value = vc.num;
        wrote = true;
      } catch (_) {}
    }

    if (wrote && shouldRelaxFormatForConstant(beforeFormat, vc.digits)) {
      safeSetCellNumberFormat(cell, "General");
    }
  }
}

function applyToggleSignToRange(area) {
  var app = getEtApp();
  var sheet = app.ActiveSheet;
  var usedRange = sheet.UsedRange;
  var effectiveRange = app.Intersect(area, usedRange);
  if (!effectiveRange) return;

  var rows = effectiveRange.Rows.Count;
  var cols = effectiveRange.Columns.Count;
  var minRow = effectiveRange.Row;
  var minCol = effectiveRange.Column;

  var formulas = effectiveRange.Formula;
  var values = effectiveRange.Value2;

  if (rows === 1 && cols === 1) {
    formulas = [[formulas]];
    values = [[values]];
  }

  var rowHidden = {};
  var colHidden = {};
  for (var ri = 1; ri <= rows; ri++) {
    try { rowHidden[ri] = sheet.Rows.Item(minRow + ri - 1).Hidden; } catch (_) { rowHidden[ri] = false; }
  }
  for (var ci = 1; ci <= cols; ci++) {
    try { colHidden[ci] = sheet.Columns.Item(minCol + ci - 1).Hidden; } catch (_) { colHidden[ci] = false; }
  }

  var result = [];
  var valueCells = [];
  var changed = false;

  for (var r = 0; r < rows; r++) {
    result[r] = [];
    for (var c = 0; c < cols; c++) {
      if (rowHidden[r + 1] || colHidden[c + 1]) {
        result[r][c] = formulas[r][c];
        continue;
      }

      var f = formulas[r][c];
      var v = values[r][c];

      if (v === null || v === "" || typeof v === "undefined") {
        result[r][c] = f;
        continue;
      }

      if (typeof f === "string" && f.charAt(0) === "=") {
        var negated = negateFormula(f);
        if (negated !== null) {
          result[r][c] = negated;
          changed = true;
        } else {
          result[r][c] = f;
        }
        continue;
      }

      if (typeof v === "number" && isFinite(v)) {
        result[r][c] = f;
        valueCells.push({ r: r, c: c, newValue: -v });
        changed = true;
        continue;
      }

      var numText = normalizeNumberText(v);
      if (numText) {
        var num = parseFloat(numText);
        if (isFinite(num)) {
          result[r][c] = f;
          valueCells.push({ r: r, c: c, newValue: -num });
          changed = true;
        } else {
          result[r][c] = f;
        }
      } else {
        result[r][c] = f;
      }
    }
  }

  if (changed) {
    effectiveRange.Formula = result;
    for (var i = 0; i < valueCells.length; i++) {
      var vc = valueCells[i];
      try {
        effectiveRange.Cells.Item(vc.r + 1, vc.c + 1).Value2 = vc.newValue;
      } catch (_) {}
    }
  }
}

function applyRoundValueToRange(area, digits) {
  var app = getEtApp();
  var usedRange = app.ActiveSheet.UsedRange;
  var effectiveRange = app.Intersect(area, usedRange);
  if (!effectiveRange) return;

  var rows = effectiveRange.Rows.Count;
  var cols = effectiveRange.Columns.Count;

  var values = effectiveRange.Value2;

  if (rows === 1 && cols === 1) {
    values = [[values]];
  }

  var result = [];
  var changed = false;
  var factor = Math.pow(10, digits);

  for (var r = 0; r < rows; r++) {
    result[r] = [];
    for (var c = 0; c < cols; c++) {
      var v = values[r][c];
      if (v === null || v === "" || typeof v === "undefined") {
        result[r][c] = v;
        continue;
      }
      if (typeof v === "number" && isFinite(v)) {
        result[r][c] = Math.round(v * factor) / factor;
        changed = true;
      } else {
        result[r][c] = v;
      }
    }
  }

  if (changed) {
    effectiveRange.Value2 = result;
  }
}

function getAreas(selection) {
  var areas = [];
  try {
    if (selection.Areas && selection.Areas.Count) {
      for (var i = 1; i <= selection.Areas.Count; i++) {
        areas.push(selection.Areas.Item(i));
      }
    } else {
      areas.push(selection);
    }
  } catch (_) {
    areas = [selection];
  }
  return areas;
}

function normalizeNumberText(value) {
  if (typeof value === "number") {
    if (isFinite(value)) return String(value);
    return null;
  }

  var s = String(value).replace(/ /g, " ").trim();
  if (!s) return null;
  if (isPureNumberExpr(s)) return s;

  var n = Number(s);
  if (!isNaN(n) && isFinite(n)) {
    return String(n);
  }

  try {
    var n2 = Number(value);
    if (!isNaN(n2) && isFinite(n2)) {
      return String(n2);
    }
  } catch (_) {}

  return null;
}

function isPureNumberExpr(expr) {
  return /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(expr.trim());
}

function extractOuterRoundArgs(formula) {
  var src = String(formula);
  var body = src.replace(/^=\s*/, "");

  var m = /^(?:_xlfn\.)?ROUND\b/i.exec(body);
  if (!m) return null;

  var i = m[0].length;
  while (i < body.length && /\s/.test(body[i])) i++;
  if (body[i] !== "(") return null;

  var startParen = i;
  var endParen = findMatchingRightParen(body, startParen);
  if (endParen < 0) return null;

  var inside = body.slice(startParen + 1, endParen);
  var sepIndex = findLastTopLevelArgSeparator(inside);
  if (sepIndex < 0) return null;

  var exprPart = inside.slice(0, sepIndex).trim();
  var nPart = inside.slice(sepIndex + 1).trim();
  if (!exprPart) return null;
  if (!/^[-+]?\d+$/.test(nPart)) return null;

  var rest = body.slice(endParen + 1).trim();
  if (rest) return null;

  return { expr: exprPart, digits: parseInt(nPart, 10) };
}

function findMatchingRightParen(text, leftParenIndex) {
  var depth = 0;
  var inString = false;

  for (var i = leftParenIndex + 1; i < text.length; i++) {
    var ch = text[i];

    if (inString) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      if (depth === 0) return i;
      depth--;
      continue;
    }
  }

  return -1;
}

function findLastTopLevelArgSeparator(text) {
  var depth = 0;
  var inString = false;
  var lastSep = -1;

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inString) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      if (depth > 0) depth--;
      continue;
    }

    if (depth === 0 && (ch === "," || ch === "，" || ch === ";" || ch === "；")) {
      lastSep = i;
    }
  }

  return lastSep;
}

function safeGetCellNumberFormat(cell) {
  try {
    if (typeof cell.NumberFormat !== "undefined") {
      return cell.NumberFormat;
    }
  } catch (_) {}
  return null;
}

function safeSetCellNumberFormat(cell, format) {
  try {
    cell.NumberFormat = format;
    return true;
  } catch (_) {
    return false;
  }
}

function shouldRelaxFormatForConstant(beforeFormat, digits) {
  if (!beforeFormat || typeof beforeFormat !== "string") return false;
  if (!Number.isFinite(digits)) return false;
  if (digits < 0) return false;

  var fmt = beforeFormat.trim();
  if (!fmt) return false;
  if (/^general$/i.test(fmt)) return false;
  if (!/^0(?:\.0+)?$/.test(fmt)) return false;

  var dot = fmt.indexOf(".");
  var currentDigits = dot >= 0 ? fmt.length - dot - 1 : 0;

  return currentDigits === digits;
}

function showMsg(msg) {
  var text = String(msg);

  try {
    if (typeof wps !== "undefined" && wps) {
      if (typeof wps.alert === "function") {
        wps.alert(text);
        return;
      }
      if (typeof wps.MessageBox === "function") {
        wps.MessageBox(text);
        return;
      }
    }
  } catch (_) {}

  try {
    if (typeof Application !== "undefined" && Application && typeof Application.Alert === "function") {
      Application.Alert(text);
      return;
    }
  } catch (_) {}

  try {
    if (typeof alert === "function") {
      alert(text);
      return;
    }
  } catch (_) {}
}

function negateFormula(formula) {
  var body = formula.slice(1).trim();
  if (!body) return null;
  if (body.charAt(0) === "-" && body.charAt(1) === "(" && isWrappedNegation(body)) {
    return "=" + body.slice(2, body.length - 1);
  }
  return "=-(" + body + ")";
}

function isWrappedNegation(body) {
  var end = findMatchingRightParen(body, 1);
  return end === body.length - 1;
}

function copyTextToClipboard(text) {
  try {
    if (typeof wps !== "undefined" && wps && typeof wps.Clipboard !== "undefined") {
      wps.Clipboard.setText(text);
      return;
    }
  } catch (_) {}
  try {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch (_) {}
}

function getGlobalObj() {
  if (typeof window !== "undefined") return window;
  if (typeof globalThis !== "undefined") return globalThis;
  return Function("return this")();
}

var G = getGlobalObj();
G.OnAddinLoad = OnAddinLoad;
G.addRound = addRound;
G.addRoundWithDigits = addRoundWithDigits;
G.addRoundCustom = addRoundCustom;
G.removeRound = removeRound;
G.toggleSign = toggleSign;
G.copyAsMarkdown = copyAsMarkdown;
G.showSettings = showSettings;
G.roundValue = roundValue;

})();
