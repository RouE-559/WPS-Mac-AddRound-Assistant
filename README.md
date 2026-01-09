# WPS-Mac-A-Round-Assistant（WPS 加Round函数加载项）

一个用于 WPS 表格（Mac）的轻量加载项：在选区内一键为公式/数值添加 `ROUND(x, 2)`，以及移除最外层 `ROUND(expr, n)`。
一个尝试使用Mac来办公的审计员，完全不懂代码。Mac上没有Windows上的方方格子，尝试使用Trae自力更生，一键添加Round和移除Round是我用得最多的功能了，后续尝试弄点别的功能

## 功能

- 添加 Round
  - 对公式：`=1/3` → `=ROUND(1/3, 2)`
  - 对纯数值：`0.1234` → `=ROUND(0.1234, 2)`
- 移除 Round（只剥离最外层）
  - `=ROUND(1/3, 2)` → `=1/3`
  - `=ROUND(0.1234, 2)` → 写回 `0.1234`（必要时会将单元格格式放宽为 `General`，避免显示上“看起来没变化”）
- 支持不连续选区（Areas）
- ROUND 参数分隔符兼容：`,` / `，` / `;` / `；`

## 环境要求

- macOS 上的 WPS Office（WPS 表格 / ET）
- 需要启用 WPS 加载项（JSAPI 加载项）能力

## 安装（macOS）

在终端进入项目目录执行：

```bash
cd /Users/lly/trae-project/WPS-addons/WPSFormulaAssistant
bash ./install_mac.sh
```

脚本会将加载项文件复制到 WPS 容器目录并写入注册信息：

- 目录：`~/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons/`
- 注册：`publish.xml`

安装完成后请完全退出并重启 WPS 表格（Cmd+Q）。

## 卸载（macOS）

```bash
cd /Users/lly/trae-project/WPS-addons/WPSFormulaAssistant
bash ./uninstall_mac.sh
```

卸载后同样建议完全退出并重启 WPS 表格。

## 使用

启动 WPS 表格后：

- “开始”选项卡会出现“公式助手”分组
- 同时也会出现一个“公式助手”自定义标签页（用于兼容性兜底）

选中单元格/区域后点击：

- 添加Round
- 移除Round

## 目录结构

```
WPSFormulaAssistant/
  README.md
  ribbon.xml       # Ribbon UI 定义
  main.js          # 按钮回调与核心逻辑
  index.html       # 入口页（WPS 启动时加载）
  install_mac.sh   # macOS 安装脚本（写 publish.xml + 拷贝文件）
  uninstall_mac.sh # macOS 卸载脚本
```

## 开发说明

- `ribbon.xml` 里 `onAction="addRound"` / `onAction="removeRound"` 会调用 `main.js` 中同名全局函数。
- 为了适配 macOS 沙箱限制，安装脚本采用“拷贝部署到容器目录”，不要用软链接指向容器外路径。
- 如需强制刷新 UI/缓存，可以提升安装脚本中的版本号（`ADDIN_VERSION`），然后重新执行安装脚本。

## 已知限制

- 使用 `imageMso` 取决于 WPS Mac 版内置资源映射；若某些图标不可用，可替换为其他 `imageMso` 或改为自带图片资源方案。

