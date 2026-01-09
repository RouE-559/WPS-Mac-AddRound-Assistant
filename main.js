// 加载项初始化回调（由 ribbon.xml 的 onLoad 触发）
function OnAddinLoad(ribbonUI) {
  try {
    if (typeof console !== "undefined" && console && console.log) {
      console.log("WPSFormulaAssistant Loaded");
    }
  } catch (_) {}
  return true;
}

// 添加Round：将选区内的公式/数值包装为 ROUND(x, 2)
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

  var prevUpdating = app.ScreenUpdating;
  app.ScreenUpdating = false;

  try {
    forEachSelectedCell(selection, function (cell) {
      tryAddRoundToCell(cell);
    });
  } catch (e) {
    showMsg("添加Round失败：" + (e && e.message ? e.message : String(e)));
  } finally {
    app.ScreenUpdating = prevUpdating;
  }
  return true;
}

// 移除Round：剥离最外层 ROUND(expr, N)，保留内部表达式
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

  var prevUpdating = app.ScreenUpdating;
  app.ScreenUpdating = false;

  try {
    forEachSelectedCell(selection, function (cell) {
      tryRemoveOuterRoundFromCell(cell);
    });
  } catch (e) {
    showMsg("移除Round失败：" + (e && e.message ? e.message : String(e)));
  } finally {
    app.ScreenUpdating = prevUpdating;
  }
  return true;
}

// 获取 WPS 表格应用对象（优先 EtApplication，其次兼容 Application）
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

// 遍历选区（支持不连续选区 Areas）
function forEachSelectedCell(selection, cb) {
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

  for (var a = 0; a < areas.length; a++) {
    var area = areas[a];
    var cells = area.Cells;
    var count = cells.Count;
    for (var j = 1; j <= count; j++) {
      cb(cells.Item(j));
    }
  }
}

// 单元格添加 Round 的核心处理逻辑
function tryAddRoundToCell(cell) {
  var value = safeGetCellValue(cell);
  if (value === null || value === "") {
    return;
  }

  var formula = safeGetCellFormula(cell);
  var hasFormula = isLikelyFormulaCell(cell, formula);

  if (hasFormula) {
    var f = String(formula || "");
    if (!f) return;
    if (/^=\s*ROUND\s*\(/i.test(f)) return;
    var inner = f.replace(/^=\s*/, "");
    if (!inner) return;
    cell.Formula = "=ROUND(" + inner + ", 2)";
    return;
  }

  var numText = normalizeNumberText(value);
  if (!numText) {
    return;
  }

  cell.Formula = "=ROUND(" + numText + ", 2)";
}

// 单元格移除 Round 的核心处理逻辑
function tryRemoveOuterRoundFromCell(cell) {
  var formula = safeGetCellFormula(cell);
  if (!formula) return;

  var f = String(formula);
  if (!f.startsWith("=")) return;
  if (!/^=\s*ROUND\s*\(/i.test(f)) return;

  var parsed = extractOuterRoundArgs(f);
  if (!parsed) return;

  var normalizedInner = parsed.expr.replace(/^=\s*/, "").trim();
  if (!normalizedInner) return;

  if (isPureNumberExpr(normalizedInner)) {
    var beforeFormat = safeGetCellNumberFormat(cell);
    var num = parseFloat(normalizedInner);

    var wrote = false;
    try {
      cell.Value2 = num;
      wrote = true;
    } catch (_) {}
    try {
      cell.Value = num;
      wrote = true;
    } catch (_) {}

    if (wrote && shouldRelaxFormatForConstant(beforeFormat, parsed.digits)) {
      safeSetCellNumberFormat(cell, "General");
    }
    return;
  }

  cell.Formula = "=" + normalizedInner;
}

// 安全读取单元格 Value
function safeGetCellValue(cell) {
  try {
    if (typeof cell.Value2 !== "undefined") {
      return cell.Value2;
    }
  } catch (_) {}
  try {
    return cell.Value;
  } catch (_) {
    return null;
  }
}

// 安全读取单元格 Formula
function safeGetCellFormula(cell) {
  try {
    return cell.Formula;
  } catch (_) {
    return "";
  }
}

// 判断该单元格是否“像公式单元格”
function isLikelyFormulaCell(cell, formula) {
  try {
    if (typeof cell.HasFormula === "boolean") return cell.HasFormula;
  } catch (_) {}
  return typeof formula === "string" && formula.trim().startsWith("=");
}

// 将数值转换为可写入公式的文本；非纯数字则返回 null
function normalizeNumberText(value) {
  if (typeof value === "number") {
    if (isFinite(value)) return String(value);
    return null;
  }

  var s = String(value).replace(/\u00a0/g, " ").trim();
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

// 判断表达式是否为纯数字常量（支持科学计数法）
function isPureNumberExpr(expr) {
  return /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(expr.trim());
}

// 从形如 “=ROUND(expr, N)” 的公式中解析出 expr（只剥离最外层）
function extractOuterRoundInnerExpr(formula) {
  var src = String(formula);
  var body = src.replace(/^=\s*/, "");

  var m = /^ROUND\b/i.exec(body);
  if (!m) return null;

  var i = m[0].length;
  while (i < body.length && /\s/.test(body[i])) i++;
  if (body[i] !== "(") return null;

  var startParen = i;
  var endParen = findMatchingRightParen(body, startParen);
  if (endParen < 0) return null;

  var inside = body.slice(startParen + 1, endParen);
  var commaIndex = findLastTopLevelComma(inside);
  if (commaIndex < 0) return null;

  var exprPart = inside.slice(0, commaIndex).trim();
  var nPart = inside.slice(commaIndex + 1).trim();
  if (!exprPart) return null;
  if (!/^[-+]?\d+$/.test(nPart)) return null;

  var rest = body.slice(endParen + 1).trim();
  if (rest) return null;

  return exprPart;
}

function extractOuterRoundArgs(formula) {
  var src = String(formula);
  var body = src.replace(/^=\s*/, "");

  var m = /^ROUND\b/i.exec(body);
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

// 在字符串/括号嵌套场景下，找到与指定左括号匹配的右括号位置
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

// 查找括号深度为 0 时最后一个逗号（用于拆分 ROUND 的两个参数）
function findLastTopLevelComma(text) {
  var depth = 0;
  var inString = false;
  var lastComma = -1;

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

    if (ch === "," && depth === 0) {
      lastComma = i;
    }
  }

  return lastComma;
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

try {
  var __wpsfaGlobal =
    typeof window !== "undefined"
      ? window
      : typeof globalThis !== "undefined"
        ? globalThis
        : Function("return this")();

  __wpsfaGlobal.OnAddinLoad = OnAddinLoad;
  __wpsfaGlobal.addRound = addRound;
  __wpsfaGlobal.removeRound = removeRound;
} catch (_) {}
