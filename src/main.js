import { Plugin, MarkdownView } from "obsidian";
import data from "./emoji-data.json";
import CSS from "./styles-inline.js";

const TRIGGER = "：：";
const COLS = 7;
const RECENT_MAX = 20;
const MAX_RENDER = 140; // 一次最多渲染的 emoji 数量，避免空查询全部时 DOM 过重卡顿
const DEBOUNCE_MS = 35; // 输入防抖，合并高频触发（35ms 足够跟手，又避免快速输入反复重渲）

const CATEGORIES = Array.from(new Set(data.map((d) => d.catName))).filter(Boolean);

const EMOJI = data.map((d) => ({
  char: d.c || "",
  name: d.n || "",
  kw: d.k || "",
  sc: d.s || "",
  catName: d.catName || "",
  u: d.u || "",
  hay: ((d.n || "") + " " + (d.k || "") + " " + (d.s || "")).toLowerCase(),
}));

// 「全部」标签用的图标：取"星星"这个 emoji，找不到就用第一个
const TAB_ALL_ICON = EMOJI.find((e) => e.name === "星星") || EMOJI[0];

// 判断是否为"两个或多个 emoji 拼成的一个视觉 emoji"（国旗 / ZWJ 序列）
function isCombined(u) {
  if (!u) return false;
  const pts = u.split("-").filter(Boolean).map((x) => parseInt(x, 16));
  if (pts.includes(0x200d)) return true;
  const regionals = pts.filter((p) => p >= 0x1f1e6 && p <= 0x1f1ff).length;
  return regionals >= 2;
}

class EmojiPickerPopup {
  constructor(plugin) {
    this.plugin = plugin;
    this.el = null;
    this.editor = null;
    this.replaceRange = null;
    this.query = "";
    this.currentCat = "常用";
    this.activeIndex = 0;
    this.filteredItems = [];
    this.cells = [];
    this.tabEls = [];
    this.gridEl = null;
    this.statusEl = null;
    this.keyHandler = null;
    this.clickOutsideHandler = null;
    this.resizeHandler = null;
  }

  open(editor, query, replaceRange) {
    this.editor = editor;
    this.query = query || "";
    this.replaceRange = replaceRange || null;
    this.activeIndex = 0;
    this.currentCat = "全部";

    this.el = document.createElement("div");
    this.el.addClass("cn-emoji-popup");

    const tabsEl = this.el.createDiv({ cls: "cn-emoji-tabs" });
    const tabCats = ["全部", ...CATEGORIES];
    for (const cat of tabCats) {
      const btn = tabsEl.createEl("button", { cls: "cn-emoji-tab" });
      btn.dataset.cat = cat;
      btn.title = cat;
      btn.addEventListener("click", () => {
        this.setCategory(cat);
        if (this.editor) this.editor.focus();
      });
      this.tabEls.push(btn);
      this.renderTabImage(btn, cat);
    }

    this.gridEl = this.el.createDiv({ cls: "cn-emoji-grid" });
    this.statusEl = this.el.createDiv({ cls: "cn-emoji-status" });

    document.body.appendChild(this.el);

    this.setCategory("全部");
    this.position();
    this.bindKeys();
  }

  renderTabImage(btn, cat) {
    const item = cat === "全部" ? TAB_ALL_ICON : EMOJI.find((e) => e.catName === cat);
    if (!item) return;
    btn.createSpan({ text: item.char, cls: "cn-emoji-tab-char" });
    btn.toggleClass("active", cat === this.currentCat);
  }

  // 计算面板应贴附的光标坐标（屏幕坐标）。CM6 / CM5 / 光标元素 / 当前行 逐级回退，
  // 都找不到则给默认位置，保证面板一定出现。
  computeCoords() {
    const cm = this.editor.cm;
    // 1) CodeMirror 6：EditorView.coordsAtPos
    try {
      if (cm && cm.state && cm.coordsAtPos) {
        const sel = cm.state.selection;
        const head = sel?.main?.head ?? sel?.ranges?.[0]?.head;
        if (head != null) {
          const c = cm.coordsAtPos(head);
          if (c) return { left: c.left, top: c.top, bottom: c.bottom };
        }
      }
    } catch (e) {}
    // 2) CodeMirror 5：charCoords
    try {
      if (cm && cm.charCoords && cm.getCursor) {
        return cm.charCoords(cm.getCursor(), "window");
      }
    } catch (e) {}
    // 3) 光标元素
    const cursorEl =
      document.querySelector(".workspace-leaf.mod-active .cm-cursorPrimary") ||
      document.querySelector(".workspace-leaf.mod-active .cm-cursor") ||
      document.querySelector(".cm-cursorPrimary") ||
      document.querySelector(".cm-cursor");
    if (cursorEl) {
      const r = cursorEl.getBoundingClientRect();
      return { left: r.left, top: r.top, bottom: r.bottom };
    }
    // 4) 当前行
    const lineEl =
      document.querySelector(".workspace-leaf.mod-active .cm-active .cm-line") ||
      document.querySelector(".cm-active .cm-line") ||
      document.querySelector(".cm-line");
    if (lineEl) {
      const r = lineEl.getBoundingClientRect();
      return { left: r.left, top: r.top, bottom: r.top + 20 };
    }
    return { left: 100, top: 100, bottom: 120 };
  }

  position() {
    if (!this.editor || !this.el) return;

    const doPosition = () => {
      const coords = this.computeCoords();
      const popupRect = this.el.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let left = coords.left;
      let top = coords.bottom + 4;

      if (left + popupRect.width > winW - 8) {
        left = Math.max(8, winW - popupRect.width - 8);
      }
      if (top + popupRect.height > winH - 8) {
        top = Math.max(8, coords.top - popupRect.height - 4);
      }

      this.el.style.left = left + "px";
      this.el.style.top = top + "px";
    };

    // 首次打开时 DOM 还没渲染完，尺寸为 0，等下一帧再算
    if (this.el.clientWidth === 0) {
      requestAnimationFrame(doPosition);
    } else {
      doPosition();
    }
  }

  setCategory(cat) {
    this.currentCat = cat;
    for (const btn of this.tabEls) {
      btn.toggleClass("active", btn.dataset.cat === cat);
    }
    this.filter();
  }

  filter() {
    const q = (this.query || "").trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const cat = this.currentCat;

    let items = cat === "全部" ? EMOJI : EMOJI.filter((e) => e.catName === cat);
    if (tokens.length) {
      items = items.filter((e) => tokens.every((t) => e.hay.includes(t)));
    }

    const total = items.length;
    // 空查询的"全部"分类下数量巨大，限制一次性渲染的 DOM 数量，防止卡顿
    const limited = total > MAX_RENDER && !tokens.length && cat === "全部";
    this.filteredItems = limited ? items.slice(0, MAX_RENDER) : items;
    this.activeIndex = 0;
    this.renderGrid();

    if (limited) {
      this.statusEl.setText(`预览前 ${this.filteredItems.length} 个 · 共 ${total} 个，输入关键词筛选`);
    } else if (this.filteredItems.length) {
      this.statusEl.setText(`共 ${this.filteredItems.length} 个`);
    } else {
      this.statusEl.setText("无结果");
    }
  }

  renderGrid() {
    const grid = this.gridEl;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    this.cells = [];

    const frag = document.createDocumentFragment();
    for (let i = 0; i < this.filteredItems.length; i++) {
      const item = this.filteredItems[i];
      const cell = frag.createEl("button", { cls: "cn-emoji-cell" });
      if (isCombined(item.u)) cell.addClass("combined");
      cell.tabIndex = -1;
      cell.dataset.index = String(i);
      cell.title = item.name;
      cell.addEventListener("click", () => this.insertItem(item));
      cell.addEventListener("mouseenter", () => {
        this.activeIndex = i;
        this.updateActive();
      });

      // 直接用系统 emoji 字符显示，所见即所得：系统能渲染就出现彩图，
      // 系统不识别（如 2023 年新增的 🪜）就直接显示方框，与插入后的效果一致
      const span = cell.createSpan({ text: item.char, cls: "cn-emoji-char" });
      this.cells.push(cell);
    }
    grid.appendChild(frag);
    this.updateActive();
  }

  updateActive() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].toggleClass("active", i === this.activeIndex);
    }
    const active = this.cells[this.activeIndex];
    if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  moveActive(dx, dy) {
    if (!this.cells.length) return;
    const cols = COLS;
    const row = Math.floor(this.activeIndex / cols);
    const col = this.activeIndex % cols;
    const rows = Math.ceil(this.cells.length / cols);
    let newRow = Math.max(0, Math.min(rows - 1, row + dy));
    let newCol = Math.max(0, Math.min(cols - 1, col + dx));
    let newIndex = newRow * cols + newCol;
    if (newIndex >= this.cells.length) newIndex = this.cells.length - 1;
    this.activeIndex = newIndex;
    this.updateActive();
  }

  async insertItem(item) {
    if (!this.editor) return;
    this.plugin.inserting = true;
    this.plugin.recordRecent(item.name);
    try {
      // 直接插入 Unicode 字符（如 🪜 或 🇨🇳），保证 .md 文件可移植、跨平台通用。
      // 系统字体缺字形时可能显示为方框，但那也是标准字符，任何 Markdown 阅读器都会一致对待。
      const insertText = item.char;
      if (this.replaceRange) {
        this.editor.replaceRange(insertText, this.replaceRange.start, this.replaceRange.end);
      } else {
        this.editor.replaceSelection(insertText);
      }
    } finally {
      this.close();
      setTimeout(() => {
        this.plugin.inserting = false;
        this.plugin.popup = null;
      }, 50);
    }
  }

  async insertActive() {
    const item = this.filteredItems[this.activeIndex];
    if (item) await this.insertItem(item);
  }

  updateQuery(query, replaceRange) {
    this.replaceRange = replaceRange;
    // 查询词没变时不重筛，避免方向键导航后选中项被 filter() 重置回第一个
    if (query === this.query) {
      this.position();
      return;
    }
    this.query = query;
    this.position();
    this.filter();
  }

  onKeyDown(e) {
    if (!this.el) return;
    // 方向键用映射表转成 (dx, dy) 偏移，避免多分支 if/else。
    // 必须阻止冒泡，否则方向键会同时移动编辑器文本光标，进而触发重筛把选中项拉回第一个。
    const moves = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] };
    if (e.key in moves) {
      e.preventDefault();
      e.stopPropagation();
      this.moveActive(moves[e.key][0], moves[e.key][1]);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      this.insertActive();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    }
  }

  onClickOutside(e) {
    if (this.el && !this.el.contains(e.target)) {
      this.close();
    }
  }

  onResize() {
    this.close();
  }

  bindKeys() {
    this.keyHandler = (e) => this.onKeyDown(e);
    this.clickOutsideHandler = (e) => this.onClickOutside(e);
    this.resizeHandler = () => this.onResize();
    document.addEventListener("keydown", this.keyHandler, true);
    setTimeout(() => {
      document.addEventListener("click", this.clickOutsideHandler, true);
      window.addEventListener("resize", this.resizeHandler);
    }, 10);
  }

  close() {
    // 关闭后短暂抑制自动重开：Esc 关闭时 ：： 仍留在文本里，Esc 键抬起会触发
    // keyup 兜底监听再次检测到 ：： 并立刻把面板打开，这里用时间窗挡掉这 250ms
    if (this.plugin) this.plugin.suppressOpenUntil = Date.now() + 250;
    // 清掉可能存在的待执行防抖，避免 Esc 关闭后定时器又把面板弹出来
    if (this.plugin && this.plugin.changeTimer) {
      clearTimeout(this.plugin.changeTimer);
      this.plugin.changeTimer = null;
    }
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.clickOutsideHandler) {
      document.removeEventListener("click", this.clickOutsideHandler, true);
      this.clickOutsideHandler = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    // 无条件清空引用，避免状态混乱导致后续 ：： 无法再弹出
    this.plugin.popup = null;
  }
}

export default class CnEmojiPlugin extends Plugin {
  async onload() {
    this.popup = null;
    this.inserting = false;
    this.recent = [];
    this.suppressOpenUntil = 0;

    await this.loadRecent();

    // 0) 把样式内联注入，防止 Obsidian 没自动加载 styles.css 导致面板看不见
    this.injectStyles();

    // 1) 监听编辑器内容变化
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor) =>
        this.onEditorChange(editor)
      )
    );

    // 2) 中文输入法组合输入结束后，再检查一次
    this.compositionHandler = (e) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view?.editor) this.onEditorChange(view.editor);
    };
    document.addEventListener("compositionend", this.compositionHandler);

    // 3) 命令面板入口：手动打开选择器
    this.addCommand({
      id: "open-picker",
      name: "打开中文 emoji 选择器",
      editorCallback: (editor) => {
        this.openPicker(editor, "", null);
      },
    });

    // 4) 左侧图标
    this.addRibbonIcon("smile", "中文 Emoji 选择器", () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view?.editor) {
        this.openPicker(view.editor, "", null);
      }
    });

    console.log("[cn-emoji] 插件已加载，试试输入 ：：");
  }

  async loadRecent() {
    try {
      const saved = await this.loadData();
      if (saved && Array.isArray(saved.recent)) {
        this.recent = saved.recent.slice(0, RECENT_MAX);
      }
    } catch (e) {
      // ignore
    }
  }

  async saveRecent() {
    try {
      await this.saveData({ recent: this.recent.slice(0, RECENT_MAX) });
    } catch (e) {
      // ignore
    }
  }

  recordRecent(name) {
    this.recent = [name, ...this.recent.filter((n) => n !== name)].slice(0, RECENT_MAX);
    this.saveRecent();
  }

  injectStyles() {
    try {
      if (document.getElementById("cn-emoji-styles")) return;
      const style = document.createElement("style");
      style.id = "cn-emoji-styles";
      style.textContent = CSS;
      document.head.appendChild(style);
      console.log("[cn-emoji] 样式已内联注入");
    } catch (e) {
      console.error("[cn-emoji] 样式注入失败", e);
    }
  }

  onEditorChange(editor) {
    if (this.inserting) return;
    if (!editor || !editor.getCursor) return;

    // 防抖：合并高频输入（editor-change 与 compositionend 可能连续触发），
    // 避免每次按键都重建 DOM 造成卡顿
    this.pendingEditor = editor;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      this.changeTimer = null;
      if (!this.inserting) this.processEditorChange(this.pendingEditor);
    }, DEBOUNCE_MS);
  }

  processEditorChange(editor) {
    if (!editor || !editor.getCursor) return;
    // 关闭后 250ms 内的自动重开一律忽略（防止 Esc 抬起立刻又把面板弹出来）
    if (this.suppressOpenUntil && Date.now() < this.suppressOpenUntil) return;
    let cursor, line, before, m;
    try {
      cursor = editor.getCursor();
      line = editor.getLine(cursor.line);
      before = line.slice(0, cursor.ch);
      m = before.match(/(：：)([^\n：]{0,30})$/);
    } catch (e) {
      console.error("[cn-emoji] 读取编辑器失败", e);
      return;
    }

    if (m) {
      const query = m[2];
      const startCh = cursor.ch - query.length - TRIGGER.length;
      const range = {
        start: { line: cursor.line, ch: startCh },
        end: { line: cursor.line, ch: cursor.ch },
      };
      // 若 popup 已存在且 DOM 完好，直接更新；否则（含状态混乱）重建
      if (this.popup && this.popup.el) {
        this.popup.updateQuery(query, range);
      } else {
        if (this.popup) this.popup.close();
        this.openPicker(editor, query, range);
      }
    } else {
      if (this.popup) this.popup.close();
    }
  }

  openPicker(editor, query, replaceRange) {
    if (this.popup) this.popup.close();
    this.popup = new EmojiPickerPopup(this);
    this.popup.open(editor, query, replaceRange);
  }

  onunload() {
    if (this.popup) this.popup.close();
    if (this.compositionHandler) {
      document.removeEventListener("compositionend", this.compositionHandler);
      this.compositionHandler = null;
    }
  }
}
