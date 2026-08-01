# Chinese Emoji Picker

An [Obsidian](https://obsidian.md) plugin that lets you search and insert emoji by **Chinese keywords**. Just type `：：` followed by a Chinese word (e.g. `：：梯子`, `：：开心`) and a picker panel pops up under the cursor.

> 中文版说明见下方「中文介绍」。

## Features

- **Chinese keyword search** — find emoji with hanzi instead of English shortcodes.
- **9 tabs** — Recently used + 8 categories, separated from the emoji grid by a clean divider.
- **7-column grid** — compact panel positioned below the cursor.
- **Standard Unicode characters** — inserted emoji are plain text, so your `.md` notes stay portable.
- **WYSIWYG preview** — emoji are rendered with your system font; unsupported characters show as boxes in the panel, exactly as they will after insertion.
- **Fully local** — no network requests.

## Installation

### Method 1: BRAT (recommended for beta updates)

1. Install the **BRAT** plugin from Obsidian's Community Plugins.
2. Open BRAT settings → `Add a beta plugin`.
3. Paste the repository URL: `https://github.com/bighead2425/obsidian-chinese-emoji-picker`.
4. Enable **Chinese Emoji Picker** in Settings → Community Plugins.

### Method 2: Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/bighead2425/obsidian-chinese-emoji-picker/releases/latest).
2. Copy them into your vault's `.obsidian/plugins/cn-emoji/` folder (create the folder if needed).
3. Enable the plugin in Obsidian → Settings → Community Plugins.

## Usage

1. In a note, type `：：` followed by a Chinese keyword, for example `：：梯子`.
2. Use ↑↓←→ to move the selection, press `Enter` (or click) to insert, or `Esc` to close.
3. The entire `：：keyword` text is replaced by the selected emoji.

## FAQ

**Q: Why do some emoji show as boxes?**  
A: Your system font does not yet support those Unicode characters. The box is an honest preview — the same box will appear after insertion. This is a font issue, not a bug.

**Q: Does it insert images or characters?**  
A: Plain Unicode characters. Your notes remain self-contained and portable.

**Q: Does it require an internet connection?**  
A: No. Everything runs locally.

## Build from source

```bash
npx esbuild src/main.js --bundle --external:obsidian --format=cjs --target=es2020 --outfile=main.js
```

Source code and data live in `src/`.

## License

MIT © bighead

---

## 中文介绍

**Chinese Emoji Picker** 是一个 Obsidian 插件，让你用**中文关键词**搜索并插入 emoji。在笔记里输入 `：：` 跟一个中文词（例如 `：：梯子`、`：：开心`），光标下方就会弹出选择面板。

### 功能

- 中文关键词检索，不用记英文 shortcode
- 9 个标签（常用 + 8 分类），标签栏与网格之间有分隔线
- 7 列网格，面板定位在光标下方
- 插入标准 Unicode 字符，`.md` 可移植
- 所见即所得：面板内用系统字体显示 emoji；不支持的字符直接显示方框
- 纯本地运行，不联网

### 安装

**方式一：BRAT（推荐）**

1. 在 Obsidian 社区插件市场安装 **BRAT**。
2. 打开 BRAT 设置 → `Add a beta plugin`。
3. 填入仓库地址：`https://github.com/bighead2425/obsidian-chinese-emoji-picker`。
4. 在设置 → 社区插件中启用 **Chinese Emoji Picker**。

**方式二：手动**

1. 从 [Releases](https://github.com/bighead2425/obsidian-chinese-emoji-picker/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 放到 vault 的 `.obsidian/plugins/cn-emoji/` 目录。
3. 在 Obsidian 设置 → 社区插件中启用。

### 使用

1. 输入 `：：` + 中文关键词，如 `：：梯子`。
2. 用方向键选择，回车或鼠标点击插入，`Esc` 关闭。
3. 选中的 emoji 会替换整段 `：：关键词`。

### 常见问题

**Q：为什么有些 emoji 显示成方框？**  
A：系统字体还不支持该 Unicode 字符。方框是真实预览，插入后也会是方框，等字体更新后自然正常。这是字体问题，不是 bug。

**Q：插入的是图片还是字符？**  
A：标准 Unicode 字符，笔记可移植，不依赖图片。

**Q：需要联网吗？**  
A：不需要，插件完全本地运行。
