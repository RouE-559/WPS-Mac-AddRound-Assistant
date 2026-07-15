#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADDIN_VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')

TARGET_DIR="$HOME/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons"

ADDIN_NAME="SheetKit"
ADDIN_TYPE="et"
OLD_ADDIN_NAME="WPSFormulaAssistant"
ADDIN_DIR_NAME="${ADDIN_NAME}_${ADDIN_VERSION}"
TARGET_PATH="$TARGET_DIR/$ADDIN_DIR_NAME"
PUBLISH_XML="$TARGET_DIR/publish.xml"

echo "[SheetKit] 开始安装 (版本: $ADDIN_VERSION)..."
echo "[SheetKit] 目标目录: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

# 清理旧项目名遗留（WPSFormulaAssistant → SheetKit 迁移）
for old_name in "$OLD_ADDIN_NAME" "$ADDIN_NAME"; do
  # 无版本号的旧目录
  if [ -e "$TARGET_DIR/$old_name" ] || [ -L "$TARGET_DIR/$old_name" ]; then
    echo "[SheetKit] 清理遗留目录: $TARGET_DIR/$old_name"
    rm -rf "$TARGET_DIR/$old_name"
  fi
  # 版本化目录
  for old_dir in "$TARGET_DIR/${old_name}_"*; do
    [ -e "$old_dir" ] || continue
    if [ "$old_dir" != "$TARGET_PATH" ]; then
      echo "[SheetKit] 清理旧版本: $old_dir"
      rm -rf "$old_dir"
    fi
  done
done

# 清理当前版本目录（如果存在）
if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
  echo "[SheetKit] 清理当前版本: $TARGET_PATH"
  rm -rf "$TARGET_PATH"
fi

echo "[SheetKit] 复制安装文件到容器目录（避免 WPS 沙箱无法跟随软链接）..."
mkdir -p "$TARGET_PATH"
cp -f "$SCRIPT_DIR/ribbon.xml" "$TARGET_PATH/ribbon.xml"
cp -f "$SCRIPT_DIR/main.js" "$TARGET_PATH/main.js"
cp -f "$SCRIPT_DIR/index.html" "$TARGET_PATH/index.html"

if [ ! -f "$PUBLISH_XML" ]; then
  echo "[SheetKit] 未发现 publish.xml，创建新文件: $PUBLISH_XML"
  cat > "$PUBLISH_XML" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jsplugins></jsplugins>
EOF
fi

echo "[SheetKit] 写入/更新 publish.xml 注册项..."
/usr/bin/python3 - "$PUBLISH_XML" "$ADDIN_NAME" "$OLD_ADDIN_NAME" "$ADDIN_TYPE" "$ADDIN_VERSION" <<'PY'
import sys
import xml.etree.ElementTree as ET

publish_xml, name, old_name, addon_type, version = sys.argv[1:6]

tree = ET.parse(publish_xml)
root = tree.getroot()

if root.tag != "jsplugins":
    raise SystemExit(f"publish.xml 根节点不是 jsplugins: {root.tag}")

# 移除旧项目名的注册
for child in list(root):
    if child.tag in ("jsplugin", "jspluginonline") and child.get("name") == old_name:
        root.remove(child)

# 更新或创建新项目名的注册
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

echo "[SheetKit] ✅ 安装完成"
echo "[SheetKit] 请完全退出并重启 WPS 表格，然后在"开始"选项卡查看"公式助手"。"
