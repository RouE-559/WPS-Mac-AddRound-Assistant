#!/bin/bash

set -euo pipefail

TARGET_DIR="$HOME/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons"

ADDIN_NAME="WPSFormulaAssistant"
ADDIN_VERSION="0.1.5"
ADDIN_DIR_NAME="${ADDIN_NAME}_${ADDIN_VERSION}"
TARGET_PATH="$TARGET_DIR/$ADDIN_DIR_NAME"
OLD_VERSION_PATH="$TARGET_DIR/${ADDIN_NAME}_0.1.0"
OLD_VERSION_PATH_2="$TARGET_DIR/${ADDIN_NAME}_0.1.1"
OLD_VERSION_PATH_3="$TARGET_DIR/${ADDIN_NAME}_0.1.2"
OLD_VERSION_PATH_4="$TARGET_DIR/${ADDIN_NAME}_0.1.3"
OLD_VERSION_PATH_5="$TARGET_DIR/${ADDIN_NAME}_0.1.4"
LEGACY_PATH="$TARGET_DIR/$ADDIN_NAME"
PUBLISH_XML="$TARGET_DIR/publish.xml"

echo "[WPSFormulaAssistant] 开始卸载..."
echo "[WPSFormulaAssistant] 目标目录: $TARGET_DIR"

if [ -e "$LEGACY_PATH" ] || [ -L "$LEGACY_PATH" ]; then
  echo "[WPSFormulaAssistant] 删除旧软链接/目录: $LEGACY_PATH"
  rm -rf "$LEGACY_PATH"
fi

if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
  echo "[WPSFormulaAssistant] 删除软链接/目录: $TARGET_PATH"
  rm -rf "$TARGET_PATH"
fi

if [ -e "$OLD_VERSION_PATH" ] || [ -L "$OLD_VERSION_PATH" ]; then
  echo "[WPSFormulaAssistant] 删除旧版本软链接/目录: $OLD_VERSION_PATH"
  rm -rf "$OLD_VERSION_PATH"
fi

if [ -e "$OLD_VERSION_PATH_2" ] || [ -L "$OLD_VERSION_PATH_2" ]; then
  echo "[WPSFormulaAssistant] 删除旧版本软链接/目录: $OLD_VERSION_PATH_2"
  rm -rf "$OLD_VERSION_PATH_2"
fi

if [ -e "$OLD_VERSION_PATH_3" ] || [ -L "$OLD_VERSION_PATH_3" ]; then
  echo "[WPSFormulaAssistant] 删除旧版本软链接/目录: $OLD_VERSION_PATH_3"
  rm -rf "$OLD_VERSION_PATH_3"
fi

if [ -e "$OLD_VERSION_PATH_4" ] || [ -L "$OLD_VERSION_PATH_4" ]; then
  echo "[WPSFormulaAssistant] 删除旧版本软链接/目录: $OLD_VERSION_PATH_4"
  rm -rf "$OLD_VERSION_PATH_4"
fi

if [ -e "$OLD_VERSION_PATH_5" ] || [ -L "$OLD_VERSION_PATH_5" ]; then
  echo "[WPSFormulaAssistant] 删除旧版本软链接/目录: $OLD_VERSION_PATH_5"
  rm -rf "$OLD_VERSION_PATH_5"
fi

if [ -f "$PUBLISH_XML" ]; then
  echo "[WPSFormulaAssistant] 从 publish.xml 移除注册项..."
  /usr/bin/python3 - "$PUBLISH_XML" "$ADDIN_NAME" <<'PY'
import sys
import xml.etree.ElementTree as ET

publish_xml, name = sys.argv[1:3]

tree = ET.parse(publish_xml)
root = tree.getroot()

if root.tag != "jsplugins":
    raise SystemExit(f"publish.xml 根节点不是 jsplugins: {root.tag}")

removed = 0
for child in list(root):
    if child.tag in ("jsplugin", "jspluginonline") and child.get("name") == name:
        root.remove(child)
        removed += 1

ET.indent(tree, space="  ", level=0)
tree.write(publish_xml, encoding="utf-8", xml_declaration=True)

print(f"removed={removed}")
PY
else
  echo "[WPSFormulaAssistant] 未发现 publish.xml，跳过移除注册项。"
fi

echo "[WPSFormulaAssistant] ✅ 卸载完成"
echo "[WPSFormulaAssistant] 建议完全退出并重启 WPS 表格以生效。"
