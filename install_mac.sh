#!/bin/bash

set -euo pipefail

TARGET_DIR="$HOME/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons"

ADDIN_NAME="WPSFormulaAssistant"
ADDIN_TYPE="et"
ADDIN_VERSION="0.1.5"
ADDIN_DIR_NAME="${ADDIN_NAME}_${ADDIN_VERSION}"
TARGET_PATH="$TARGET_DIR/$ADDIN_DIR_NAME"
LEGACY_PATH="$TARGET_DIR/$ADDIN_NAME"
OLD_VERSION_PATH="$TARGET_DIR/${ADDIN_NAME}_0.1.0"
OLD_VERSION_PATH_2="$TARGET_DIR/${ADDIN_NAME}_0.1.1"
OLD_VERSION_PATH_3="$TARGET_DIR/${ADDIN_NAME}_0.1.2"
OLD_VERSION_PATH_4="$TARGET_DIR/${ADDIN_NAME}_0.1.3"
OLD_VERSION_PATH_5="$TARGET_DIR/${ADDIN_NAME}_0.1.4"
PUBLISH_XML="$TARGET_DIR/publish.xml"

echo "[WPSFormulaAssistant] 开始安装..."
echo "[WPSFormulaAssistant] 目标目录: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

if [ -e "$LEGACY_PATH" ] || [ -L "$LEGACY_PATH" ]; then
  echo "[WPSFormulaAssistant] 清理旧软链接: $LEGACY_PATH"
  rm -rf "$LEGACY_PATH"
fi

if [ -e "$OLD_VERSION_PATH" ] || [ -L "$OLD_VERSION_PATH" ]; then
  echo "[WPSFormulaAssistant] 清理旧版本: $OLD_VERSION_PATH"
  rm -rf "$OLD_VERSION_PATH"
fi

if [ -e "$OLD_VERSION_PATH_2" ] || [ -L "$OLD_VERSION_PATH_2" ]; then
  echo "[WPSFormulaAssistant] 清理旧版本: $OLD_VERSION_PATH_2"
  rm -rf "$OLD_VERSION_PATH_2"
fi

if [ -e "$OLD_VERSION_PATH_3" ] || [ -L "$OLD_VERSION_PATH_3" ]; then
  echo "[WPSFormulaAssistant] 清理旧版本: $OLD_VERSION_PATH_3"
  rm -rf "$OLD_VERSION_PATH_3"
fi

if [ -e "$OLD_VERSION_PATH_4" ] || [ -L "$OLD_VERSION_PATH_4" ]; then
  echo "[WPSFormulaAssistant] 清理旧版本: $OLD_VERSION_PATH_4"
  rm -rf "$OLD_VERSION_PATH_4"
fi

if [ -e "$OLD_VERSION_PATH_5" ] || [ -L "$OLD_VERSION_PATH_5" ]; then
  echo "[WPSFormulaAssistant] 清理旧版本: $OLD_VERSION_PATH_5"
  rm -rf "$OLD_VERSION_PATH_5"
fi

if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
  echo "[WPSFormulaAssistant] 清理旧版本: $TARGET_PATH"
  rm -rf "$TARGET_PATH"
fi

echo "[WPSFormulaAssistant] 复制安装文件到容器目录（避免 WPS 沙箱无法跟随软链接）..."
mkdir -p "$TARGET_PATH"
cp -f "./ribbon.xml" "$TARGET_PATH/ribbon.xml"
cp -f "./main.js" "$TARGET_PATH/main.js"
cp -f "./index.html" "$TARGET_PATH/index.html"

if [ ! -f "$PUBLISH_XML" ]; then
  echo "[WPSFormulaAssistant] 未发现 publish.xml，创建新文件: $PUBLISH_XML"
  cat > "$PUBLISH_XML" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jsplugins></jsplugins>
EOF
fi

echo "[WPSFormulaAssistant] 写入/更新 publish.xml 注册项..."
/usr/bin/python3 - "$PUBLISH_XML" "$ADDIN_NAME" "$ADDIN_TYPE" "$ADDIN_VERSION" <<'PY'
import sys
import xml.etree.ElementTree as ET

publish_xml, name, addon_type, version = sys.argv[1:5]

tree = ET.parse(publish_xml)
root = tree.getroot()

if root.tag != "jsplugins":
    raise SystemExit(f"publish.xml 根节点不是 jsplugins: {root.tag}")

target = None
for child in list(root):
    if child.tag in ("jsplugin", "jspluginonline") and child.get("name") == name:
        target = child
        break

if target is None:
    target = ET.SubElement(root, "jsplugin")

target.set("name", name)
target.set("type", addon_type)
target.set("version", version)
target.set("url", "file://")
target.set("enable", "enable_dev")

ET.indent(tree, space="  ", level=0)
tree.write(publish_xml, encoding="utf-8", xml_declaration=True)
PY

echo "[WPSFormulaAssistant] ✅ 安装完成"
echo "[WPSFormulaAssistant] 请完全退出并重启 WPS 表格，然后在“开始”选项卡查看“公式助手”。"
