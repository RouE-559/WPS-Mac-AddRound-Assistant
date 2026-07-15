/**
 * parser.test.js — WPS 加载项纯函数单元测试
 *
 * 被测函数从 main.js (IIFE) 中复制出来，因为原文件不 export。
 * 使用 Node.js 内置 assert 模块，零外部依赖。
 * 运行：node test/parser.test.js
 */

"use strict";

const assert = require("assert");

// ============================================================
// 被测函数（从 main.js 复制，保持原样）
// ============================================================

// --- isPureNumberExpr (main.js L315-317) ---
function isPureNumberExpr(expr) {
  return /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(expr.trim());
}

// --- findMatchingRightParen (main.js L349-384) ---
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

// --- findLastTopLevelArgSeparator (main.js L386-425) ---
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

// --- extractOuterRoundArgs (main.js L319-347) ---
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

// --- normalizeNumberText (main.js L290-313) ---
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

// --- shouldRelaxFormatForConstant (main.js L445-459) ---
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

// --- negateFormula (main.js L996-1003) ---
function negateFormula(formula) {
  var body = formula.slice(1).trim();
  if (!body) return null;
  if (body.charAt(0) === "-" && body.charAt(1) === "(" && isWrappedNegation(body)) {
    return "=" + body.slice(2, body.length - 1);
  }
  return "=-(" + body + ")";
}

// --- isWrappedNegation (main.js L1005-1008) ---
function isWrappedNegation(body) {
  var end = findMatchingRightParen(body, 1);
  return end === body.length - 1;
}

// --- detectTextHeaderRows (main.js L387-405) ---
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


// ============================================================
// 测试工�?
// ============================================================

var totalPassed = 0;
var totalFailed = 0;
var currentSection = "";

function describe(name) {
  currentSection = name;
  console.log("\n" + "=".repeat(60));
  console.log("  " + name);
  console.log("=".repeat(60));
}

function test(name, fn) {
  try {
    fn();
    totalPassed++;
    console.log("  ✓ " + name);
  } catch (e) {
    totalFailed++;
    console.log("  ✗ " + name);
    console.log("    " + e.message.replace(/\n/g, "\n    "));
  }
}

function assertEqual(actual, expected) {
  assert.deepStrictEqual(actual, expected);
}

function assertNull(actual) {
  assert.strictEqual(actual, null);
}

function report() {
  console.log("\n" + "=".repeat(60));
  console.log("  总计: " + (totalPassed + totalFailed) + " 个测试");
  console.log("  通过: " + totalPassed + " ✓");
  if (totalFailed > 0) {
    console.log("  失败: " + totalFailed + " ✗");
  }
  console.log("=".repeat(60) + "\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}


// ============================================================
// 测试用例
// ============================================================

// --- extractOuterRoundArgs ---
describe("extractOuterRoundArgs");

test("普通 ROUND 公式", function() {
  var r = extractOuterRoundArgs("=ROUND(A1+B1, 2)");
  assertEqual(r, { expr: "A1+B1", digits: 2 });
});

test("嵌套函数括号", function() {
  var r = extractOuterRoundArgs("=ROUND(SUM(A1:A10), 3)");
  assertEqual(r, { expr: "SUM(A1:A10)", digits: 3 });
});

test("嵌套 ROUND", function() {
  var r = extractOuterRoundArgs("=ROUND(ROUND(A1,1), 2)");
  assertEqual(r, { expr: "ROUND(A1,1)", digits: 2 });
});

test("_xlfn 前缀", function() {
  var r = extractOuterRoundArgs("=_xlfn.ROUND(A1, 2)");
  assertEqual(r, { expr: "A1", digits: 2 });
});

test("_xlfn 前缀带空格", function() {
  var r = extractOuterRoundArgs("=_xlfn.ROUND( A1 , 2 )");
  assertEqual(r, { expr: "A1", digits: 2 });
});

test("不是 ROUND 公式", function() {
  var r = extractOuterRoundArgs("=SUM(A1)");
  assertNull(r);
});

test("缺少第二个参数", function() {
  var r = extractOuterRoundArgs("=ROUND(A1)");
  assertNull(r);
});

test("字符串中包含逗号", function() {
  var r = extractOuterRoundArgs('=ROUND("hello, world", 2)');
  assertEqual(r, { expr: '"hello, world"', digits: 2 });
});

test("等号前有空格 — 返回 null（函数不处理等号前空白）", function() {
  var r = extractOuterRoundArgs("  =ROUND(A1, 0)");
  assertNull(r);
});

test("ROUND 后有空格", function() {
  var r = extractOuterRoundArgs("=ROUND  (A1, 5)");
  assertEqual(r, { expr: "A1", digits: 5 });
});

test("digits 为负数", function() {
  var r = extractOuterRoundArgs("=ROUND(A1, -2)");
  assertEqual(r, { expr: "A1", digits: -2 });
});

test("空字符串", function() {
  var r = extractOuterRoundArgs("");
  assertNull(r);
});

test("无等号的 ROUND", function() {
  var r = extractOuterRoundArgs("ROUND(A1,2)");
  assertEqual(r, { expr: "A1", digits: 2 });
});

test("ROUND 后有额外字符", function() {
  var r = extractOuterRoundArgs("=ROUND(A1,2)+1");
  assertNull(r);
});

test("小写 round", function() {
  var r = extractOuterRoundArgs("=round(b1, 3)");
  assertEqual(r, { expr: "b1", digits: 3 });
});


// --- findMatchingRightParen ---
describe("findMatchingRightParen");

test("简单括号匹配", function() {
  var r = findMatchingRightParen("(abc)", 0);
  assertEqual(r, 4);
});

test("嵌套括号", function() {
  var r = findMatchingRightParen("(a(b)c)", 0);
  assertEqual(r, 6);
});

test("字符串中有括号 — 跳过字符串内的右括号，外层 ) 在索引 6", function() {
  // "(a\")"b)"  → 索引: 0:( 1:a 2:\" 3:) 4:\" 5:b 6:)
  // 索引 3 的 ) 在字符串内被跳过，depth 保持 0，索引 6 的 ) 为匹配
  var r = findMatchingRightParen('(a")"b)', 0);
  assertEqual(r, 6);
});

test("无匹配括号", function() {
  var r = findMatchingRightParen("(abc", 0);
  assertEqual(r, -1);
});

test("空字符串", function() {
  var r = findMatchingRightParen("", 0);
  assertEqual(r, -1);
});

test("多层嵌套", function() {
  var r = findMatchingRightParen("(((a)))", 0);
  assertEqual(r, 6);
});

test("从中间位置开始", function() {
  // "a(b(c)d)e" 从索引 1 '(' 开始 → 匹配索引 7 的 ')'
  var r = findMatchingRightParen("a(b(c)d)e", 1);
  assertEqual(r, 7);
});

test("字符串中有转义双引号", function() {
  // "(\"\"))"  → 索引: 0:( 1:\" 2:\" 3:) 4:)
  // 索引 1 进入字符串，索引 2 \"\" 中第二个 \" 看到 text[3]=')'!='\"' → 退出字符串
  // 索引 3 ')' depth=0 → 返回 3
  var r = findMatchingRightParen('("") )', 0);
  assertEqual(r, 3);
});


// --- findLastTopLevelArgSeparator ---
describe("findLastTopLevelArgSeparator");

test("简单逗号分隔", function() {
  var r = findLastTopLevelArgSeparator("A1, 2");
  assertEqual(r, 2);
});

test("跳过括号内的逗号", function() {
  // "SUM(A1,B1), 2" → 索引 10 的逗号为顶层分隔符
  var r = findLastTopLevelArgSeparator("SUM(A1,B1), 2");
  assertEqual(r, 10);
});

test("分号分隔符", function() {
  var r = findLastTopLevelArgSeparator("A1; 2");
  assertEqual(r, 2);
});

test("中文逗号", function() {
  var r = findLastTopLevelArgSeparator("A1，2");
  assertEqual(r, 2);
});

test("中文分号", function() {
  var r = findLastTopLevelArgSeparator("A1；2");
  assertEqual(r, 2);
});

test("跳过字符串内的逗号", function() {
  // `"a,b", 2` → 索引: 0:\" 1:a 2:, 3:b 4:\" 5:, 6:  7:2
  // 索引 2 的逗号在字符串内被跳过，索引 5 的逗号为顶层分隔符
  var r = findLastTopLevelArgSeparator('"a,b", 2');
  assertEqual(r, 5);
});

test("无分隔符", function() {
  var r = findLastTopLevelArgSeparator("A1");
  assertEqual(r, -1);
});

test("多个分隔符取最后一个", function() {
  // "A1, B1, C1" → 逗号在索引 2 和 6，取最后一个 6
  var r = findLastTopLevelArgSeparator("A1, B1, C1");
  assertEqual(r, 6);
});

test("多个括号嵌套", function() {
  // "IF(A1>0, SUM(B1,C1)), 2" → 索引 20 的逗号为顶层分隔符
  var r = findLastTopLevelArgSeparator("IF(A1>0, SUM(B1,C1)), 2");
  assertEqual(r, 20);
});

test("空字符串", function() {
  var r = findLastTopLevelArgSeparator("");
  assertEqual(r, -1);
});

test("只有分隔符", function() {
  var r = findLastTopLevelArgSeparator(",");
  assertEqual(r, 0);
});


// --- isPureNumberExpr ---
describe("isPureNumberExpr");

test("正整数", function() {
  assertEqual(isPureNumberExpr("123"), true);
});

test("负整数", function() {
  assertEqual(isPureNumberExpr("-45"), true);
});

test("小数", function() {
  assertEqual(isPureNumberExpr("-45.67"), true);
});

test("科学计数法", function() {
  assertEqual(isPureNumberExpr("1.5e10"), true);
});

test("负科学计数法", function() {
  assertEqual(isPureNumberExpr("-3.14E-2"), true);
});

test("以小数点开头", function() {
  assertEqual(isPureNumberExpr(".5"), true);
});

test("以小数点开头带符号", function() {
  assertEqual(isPureNumberExpr("+.5"), true);
});

test("纯字母", function() {
  assertEqual(isPureNumberExpr("abc"), false);
});

test("含空格", function() {
  assertEqual(isPureNumberExpr("12 34"), false);
});

test("空字符串", function() {
  assertEqual(isPureNumberExpr(""), false);
});

test("含运算符", function() {
  assertEqual(isPureNumberExpr("1+2"), false);
});

test("前后有空格", function() {
  // trim 后再判断，所以空格不影响
  assertEqual(isPureNumberExpr("  42  "), true);
});

test("十六进制", function() {
  assertEqual(isPureNumberExpr("0xFF"), false);
});


// --- normalizeNumberText ---
describe("normalizeNumberText");

test("number 类型整数", function() {
  assertEqual(normalizeNumberText(123), "123");
});

test("number 类型小数", function() {
  assertEqual(normalizeNumberText(45.6), "45.6");
});

test("string 类型整数", function() {
  assertEqual(normalizeNumberText("789"), "789");
});

test("string 类型负数", function() {
  assertEqual(normalizeNumberText("-1.5"), "-1.5");
});

test("空字符串", function() {
  assertNull(normalizeNumberText(""));
});

test("纯字母字符串", function() {
  assertNull(normalizeNumberText("abc"));
});

test("Infinity", function() {
  assertNull(normalizeNumberText(Infinity));
});

test("NaN", function() {
  assertNull(normalizeNumberText(NaN));
});

test("前后带空格", function() {
  assertEqual(normalizeNumberText("  3.14  "), "3.14");
});

test("全角数字", function() {
  // 全角数字不会被 isPureNumberExpr 匹配，但 Number() 能解析
  // "１２３" → Number("１２３") = NaN → Number("１２３") again → NaN → null
  assertNull(normalizeNumberText("１２３"));
});

test("数字后跟非数字字符", function() {
  // "123abc" → isPureNumberExpr false → Number("123abc") = NaN → null
  assertNull(normalizeNumberText("123abc"));
});

test("boolean true — Number(true)=1 生效", function() {
  // typeof !== "number", s="true", isPureNumberExpr false, Number("true")=NaN
  // 但 Number(true)=1 为有限数，返回 "1"
  assertEqual(normalizeNumberText(true), "1");
});


// --- shouldRelaxFormatForConstant ---
describe("shouldRelaxFormatForConstant");

test("0.00 匹配 digits=2", function() {
  assertEqual(shouldRelaxFormatForConstant("0.00", 2), true);
});

test("0.0 匹配 digits=1", function() {
  assertEqual(shouldRelaxFormatForConstant("0.0", 1), true);
});

test("0 匹配 digits=0", function() {
  assertEqual(shouldRelaxFormatForConstant("0", 0), true);
});

test("0.00 不匹配 digits=3", function() {
  assertEqual(shouldRelaxFormatForConstant("0.00", 3), false);
});

test("General 格式", function() {
  assertEqual(shouldRelaxFormatForConstant("General", 2), false);
});

test("null beforeFormat", function() {
  assertEqual(shouldRelaxFormatForConstant(null, 2), false);
});

test("#,##0.00 不是简单格式", function() {
  assertEqual(shouldRelaxFormatForConstant("#,##0.00", 2), false);
});

test("空字符串 beforeFormat", function() {
  assertEqual(shouldRelaxFormatForConstant("", 2), false);
});

test("digits 为负数", function() {
  assertEqual(shouldRelaxFormatForConstant("0.00", -1), false);
});

test("digits 非整数", function() {
  assertEqual(shouldRelaxFormatForConstant("0.00", 2.7), false);
});

test("0.000 匹配 digits=3", function() {
  assertEqual(shouldRelaxFormatForConstant("0.000", 3), true);
});

test("前后带空格的 General", function() {
  assertEqual(shouldRelaxFormatForConstant("  General  ", 2), false);
});

test("仅空白字符", function() {
  assertEqual(shouldRelaxFormatForConstant("   ", 2), false);
});

test("0.00 前后带空格", function() {
  assertEqual(shouldRelaxFormatForConstant("  0.00  ", 2), true);
});


// --- negateFormula ---
describe("negateFormula");

test("简单表达式包裹取反", function() {
  assertEqual(negateFormula("=A1+B1"), "=-(A1+B1)");
});

test("已是 -(expr) 形式则剥离", function() {
  assertEqual(negateFormula("=-(A1+B1)"), "=A1+B1");
});

test("复杂表达式包裹取反", function() {
  assertEqual(negateFormula("=round(2.345,2)-sum(A1:A3)"), "=-(round(2.345,2)-sum(A1:A3))");
});

test("复杂表达式剥离取反", function() {
  assertEqual(negateFormula("=-(round(2.345,2)-sum(A1:A3))"), "=round(2.345,2)-sum(A1:A3)");
});

test("纯数字常量", function() {
  assertEqual(negateFormula("=100"), "=-(100)");
});

test("空 body（仅等号）", function() {
  assertNull(negateFormula("="));
});

test("=-A1 不是 -(expr) 形式，继续包裹", function() {
  assertEqual(negateFormula("=-A1"), "=-(-A1)");
});

test("=-() 剥离后 body 为空", function() {
  assertEqual(negateFormula("=-()"), "=");
});


// --- isWrappedNegation ---
describe("isWrappedNegation");

test("简单 -(expr) 形式", function() {
  assertEqual(isWrappedNegation("-(A1+B1)"), true);
});

test("括号不到末尾", function() {
  assertEqual(isWrappedNegation("-(A1)+B1"), false);
});

test("嵌套括号匹配到末尾", function() {
  assertEqual(isWrappedNegation("-(SUM(A1:A10))"), true);
});

test("无括号", function() {
  assertEqual(isWrappedNegation("-A1"), false);
});

test("空括号", function() {
  assertEqual(isWrappedNegation("-()"), true);
});


// --- detectTextHeaderRows ---
describe("detectTextHeaderRows");

test("第一行全文本，第二行有数字", function() {
  assertEqual(detectTextHeaderRows([["名称","数量","金额"], ["苹果","10","25.5"]]), 1);
});

test("前两行全文本", function() {
  assertEqual(detectTextHeaderRows([["类别","项目"], ["小计","合计"], ["苹果","10"]]), 2);
});

test("第一行就是数字", function() {
  assertEqual(detectTextHeaderRows([["10","20","30"]]), 0);
});

test("前两行文本，第三行数字", function() {
  assertEqual(detectTextHeaderRows([["A","B","C"], ["D","E","F"], ["1","2","3"]]), 2);
});


// ============================================================
// 输出结果
// ============================================================
report();
