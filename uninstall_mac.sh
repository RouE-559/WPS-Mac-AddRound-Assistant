#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADDIN_VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')

TARGET_DIR="$HOME/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons"

ADDIN_NAME="SheetKit"
OLD_ADDIN_NAME="WPSFormulaAssistant"
ADDIN_DIR_NAME="${ADDIN_NAME}_${ADDIN_VERSION}"
TARGET_PATH="$TARGET_DIR/$ADDIN_DIR_NAME"
PUBLISH_XML="$TARGET_DIR/publish.xml"

echo "[SheetKit] 开始卸载 (版本: $ADDIN_VERSION)..."
echo "[SheetKit] 目标目录: $TARGET_DIR"

# 清理 SheetKit 目录
for old_dir in "$TARGET_DIR/${ADDIN_NAME}_"* "$TARGET_DIR/${OLD_ADDIN_NAME}_"*; do
  [ -e "$old_dir" ] || continue
  echo "[SheetKit] 删除版本目录: $old_dir"
  rm -rf "$old_dir"
done

# 清理无版本号的目录
for legacy in "$TARGET_DIR/$ADDIN_NAME" "$TARGET_DIR/$OLD_ADDIN_NAME"; do
  if [ -e "$legacy" ] || [ -L "$legacy" ]; then
    echo "[SheetKit] 删除遗留目录: $legacy"
    rm -rf "$legacy"
  fi
done

if [ -f "$PUBLISH_XML" ]; then
  echo "[SheetKit] 从 publish.xml 移除注册项..."
  /usr/bin/python3 - "$PUBLISH_XML" "$ADDIN_NAME" "$OLD_ADDIN_NAME" <<'PY'
import sys
import xml.etree.ElementTree as ET

publish_xml, name, old_name = sys.argv[1:4]

tree = ET.parse(publish_xml)
root = tree.getroot()

if root.tag != "jsplugins":
    raise SystemExit(f"publish.xml 根节点不是 jsplugins: {root.tag}")

removed = 0
for child in list(root):
    if child.tag in ("jsplugin", "jspluginonline") and child.get("name") in (name, old_name):
        root.remove(child)
        removed += 1

ET.indent(tree, space="  ", level=0)
tree.write(publish_xml, encoding="utf-8", xml_declaration=True)

print(f"removed={removed}")
PY
else
  echo "[SheetKit] 未发现 publish.xml，跳过移除注册项。"
fi

echo "[SheetKit] ✅ 卸载完成"
echo "[SheetKit] 建议完全退出并重启 WPS 表格以生效。"
