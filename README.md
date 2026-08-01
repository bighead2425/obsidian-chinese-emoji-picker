# Obsidian Chinese Emoji Picker（中文 Emoji 选择器）

> 用**中文关键词**搜索并插入 emoji 的 Obsidian 插件。输入 `：：` + 中文词，浮动面板即出现在光标下方，回车或点击即可插入标准 Unicode 字符——不用切输入法、不用背英文 shortcode。

**版本**：0.2.0 ｜ **作者**：bighead ｜ **许可证**：MIT

---

## ✨ 功能特性

- **中文触发**：输入 `：：` （两个中文冒号）即唤起面板，无需切换输入法、无需记英文 shortcode。
- **中文搜索**：直接输入中文关键词（如 `梯子`、`笑脸`、`心`），按中文名检索 1900+ 条 emoji。
- **光标跟随**：面板自动定位在 `：：关键词` 下方，长笔记滚动后也始终可见。
- **标签分类**：9 个标签（常用 + 8 大分类），默认"全部"；"常用"标签记录最近 20 个。
- **7 列网格**：紧凑排版，一屏看更多；标签栏与 emoji 网格之间有分隔线，层次清晰。
- **多种插入**：方向键导航 + 回车，或鼠标点击，自动把 `：：关键词` 整段替换为 emoji；Esc 关闭面板。
- **所见即所得**：面板内 emoji 用系统字体直接显示，与插入到笔记后的效果完全一致；系统缺字形的字符在面板里就是方框（提示你本机字体不支持），而插入的仍是标准 Unicode，换台支持的设备即可正常显示。
- **高度可移植**：插入的是纯 Unicode 字符，`.md` 文件不依赖本插件，发给谁都能看。
- **轻量**：不打包任何 SVG / 图片资源，构建产物约 590KB。

---

## 📦 安装

### 方式一：BRAT（推荐，支持自动更新）

1. 在 Obsidian 社区插件市场安装 **BRAT**。
2. 打开 BRAT 设置 → **Add a beta plugin**。
3. 填入仓库地址：`bighead2425/obsidian-chinese-emoji-picker`。
4. 回到 设置 → 第三方插件，启用 **Obsidian Chinese Emoji Picker**。
（这会儿应该还不能用，建议还是用下面的方式二吧）

### 方式二：手动安装

1. 到本仓库的 Release 页下载 `main.js`、`manifest.json`、`styles.css` 三个文件。
2. 放进 `你的仓库/.obsidian/plugins/cn-emoji/`（没有就新建该目录）。
3. Obsidian 设置 → 第三方插件 → 启用 **Obsidian Chinese Emoji Picker**。
（搞不定的话，建议问问AI，或者调用个agrent帮着操作一下）

---

## 🚀 使用示例

| 输入 | 效果 |
|------|------|
| `：：梯子` | 搜索"梯子"，选中后大概插入 🪜 |
| `：：笑脸` | 插入 😄 |
| `：：红心` | 插入 ❤️ |
| `：：太阳` | 插入 ☀️ |

> 提示：先敲两个**中文冒号** `：：` （不是英文 `:`），再输入中文词。面板弹出后可用 **方向键**移动选中、**回车**插入、**Esc** 关闭。

---

## ❓ 常见问题

**Q：为什么有些 emoji 在面板里显示成方框（□）？**

面板直接调用系统 emoji 字体显示，所见即所得。方框说明**你当前系统字体不包含该 emoji**——例如 Windows 默认字体缺 2023 年后的新 emoji（如 🪜），且 Windows 出于策略故意不渲染国旗（🇨🇳 退化为 "CN" 字母，这是微软行为，非插件问题）。这**不影响插入**：写入笔记的仍是标准 Unicode 字符，在手机 / Mac / 装了彩色 emoji 字体的设备上能正常显示。

**Q：插入的是图片还是字符？**

标准 Unicode 字符（如 🪜、❤️）。不插入任何图片链接，`.md` 文件纯文本、可移植。

**Q：插件会联网收集我的内容吗？**

不会。插件只在本地读取光标处文本、写入编辑器内容，没有任何网络请求。

---

## 🛠 开发 / 构建

```bash
# 需要 Node.js 与 esbuild
node node_modules/esbuild/bin/esbuild src/main.js \
  --bundle --external:obsidian --format=cjs --target=es2020 \
  --outfile=main.js
```

目录结构：

- `src/main.js` —— 主逻辑
- `src/emoji-data.json` —— 1900+ 条 emoji 数据（中文名 / 关键词 / Unicode / 分类）
- `src/styles-inline.js` —— 内联样式（运行时注入 `<head>`，不依赖 Obsidian 加载 `styles.css`）
- `main.js` / `manifest.json` / `styles.css` —— 构建产物 / 部署文件

---

## 📄 许可证

MIT © bighead

---

## 🙏 感谢

思源笔记、obsidian，workbuddy
