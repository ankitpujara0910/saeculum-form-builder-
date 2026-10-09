import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { FormDb } from '../services/form-db';
import {
  FormDoc,
  FormNode,
  FormPage,
  QuestionType,
  cloneWithNewIds,
  createForm,
  createPage,
  createQuestion,
  createSection,
} from '../models/form.model';
import {
  countQuestions,
  insertAt,
  locate,
  mapChildrenOf,
  moveNode,
  patchNode,
  removeNodes,
  topLevelSelected,
} from './form-ops';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1000;

@Injectable({ providedIn: 'root' })
export class FormStore {
  private readonly db = inject(FormDb);

  readonly doc = signal<FormDoc>(createForm());
  /** Page that "+ Question" / "Section" / paste target; falls back to the last page. */
  readonly activePageId = signal<string | null>(null);
  readonly activePage = computed<FormPage | null>(() => {
    const pages = this.doc().pages;
    return pages.find((p) => p.id === this.activePageId()) ?? pages[pages.length - 1] ?? null;
  });
  readonly selection = signal<ReadonlySet<string>>(new Set());
  readonly clipboard = signal<FormNode[]>([]);
  readonly focusId = signal<string | null>(null);
  readonly ready = signal(false);
  readonly totalQuestions = computed(() => this.doc().pages.reduce((n, p) => n + countQuestions(p.children), 0));

  private past: FormDoc[] = [];
  private future: FormDoc[] = [];
  private lastKey: string | null = null;
  private lastTime = 0;
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  constructor() {
    this.db.load().then((saved) => {
      // Ignore data saved by an older layout (pages without a description) so stale forms never replace the initial screen.
      if (saved?.pages?.length && saved.pages.every((p) => typeof p.description === 'string')) this.doc.set(saved);
      this.ready.set(true);
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const d = this.doc();
      if (!this.ready()) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.db.save(d), 400);
    });
  }

  // ---- history -------------------------------------------------------------
  private commit(next: FormDoc, coalesceKey?: string, record = true): void {
    const cur = this.doc();
    if (next === cur) return;
    if (record) {
      const now = Date.now();
      const coalesce = !!coalesceKey && coalesceKey === this.lastKey && now - this.lastTime < COALESCE_MS;
      if (!coalesce) {
        this.past.push(cur);
        if (this.past.length > HISTORY_LIMIT) this.past.shift();
      }
      this.future = [];
      this.lastKey = coalesceKey ?? null;
      this.lastTime = now;
    }
    this.doc.set(next);
    this.syncFlags();
  }

  private syncFlags(): void {
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }

  undo(): void {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.doc());
    this.lastKey = null;
    this.doc.set(prev);
    this.syncFlags();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.doc());
    this.lastKey = null;
    this.doc.set(next);
    this.syncFlags();
  }

  // ---- pages ---------------------------------------------------------------
  addPage(): void {
    const page = createPage();
    this.commit({ ...this.doc(), pages: [...this.doc().pages, page] });
    this.activePageId.set(page.id);
    this.focusId.set(page.children[0].id);
  }

  updatePage(id: string, patch: Partial<FormPage>, coalesce = false): void {
    this.commit(
      { ...this.doc(), pages: this.doc().pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
      coalesce ? 'page:' + id : undefined,
      !('collapsed' in patch),
    );
  }

  removePage(id: string): void {
    this.commit({ ...this.doc(), pages: this.doc().pages.filter((p) => p.id !== id) });
  }

  duplicatePage(id: string): void {
    const pages = this.doc().pages;
    const i = pages.findIndex((p) => p.id === id);
    if (i < 0) return;
    const src = pages[i];
    const copy: FormPage = { ...src, id: crypto.randomUUID(), children: src.children.map((c) => cloneWithNewIds(c)) };
    this.commit({ ...this.doc(), pages: [...pages.slice(0, i + 1), copy, ...pages.slice(i + 1)] });
  }

  /** Returns the page that new content goes to, creating one when the form is empty. */
  private targetPageId(): string {
    const page = this.activePage();
    if (page) return page.id;
    const fresh: FormPage = { ...createPage(), children: [] };
    this.commit({ ...this.doc(), pages: [fresh] });
    this.activePageId.set(fresh.id);
    return fresh.id;
  }

  // ---- add / edit / remove -------------------------------------------------
  addSectionAfter(id: string): void {
    const loc = locate(this.doc(), id);
    if (loc) this.commit(insertAt(this.doc(), loc.parentId, loc.index + 1, [createSection()]));
  }

  addQuestionAfter(id: string, type: QuestionType = 'text'): void {
    const loc = locate(this.doc(), id);
    if (!loc) return;
    const q = createQuestion(type);
    this.commit(insertAt(this.doc(), loc.parentId, loc.index + 1, [q]));
    this.focusId.set(q.id);
  }

  addQuestion(parentId?: string, type: QuestionType = 'text'): void {
    parentId ??= this.targetPageId();
    const q = createQuestion(type);
    this.commit(mapChildrenOf(this.doc(), parentId, (c) => [...c, q]));
    this.expand(parentId);
    this.focusId.set(q.id);
  }

  addSection(parentId?: string): void {
    parentId ??= this.targetPageId();
    this.commit(mapChildrenOf(this.doc(), parentId, (c) => [...c, createSection()]));
    this.expand(parentId);
  }

  update(id: string, patch: Partial<FormNode>, coalesce = false): void {
    this.commit(patchNode(this.doc(), id, patch), coalesce ? 'edit:' + id : undefined);
  }

  /** Collapse state is view state: not recorded in undo history. */
  setCollapsed(id: string, collapsed: boolean): void {
    this.commit(patchNode(this.doc(), id, { collapsed } as Partial<FormNode>), undefined, false);
  }

  private expand(id: string): void {
    const loc = locate(this.doc(), id);
    if (loc?.node.kind === 'section' && loc.node.collapsed) this.setCollapsed(id, false);
  }

  remove(ids: Iterable<string>): void {
    const set = new Set(ids);
    this.commit(removeNodes(this.doc(), set));
    this.selection.update((s) => new Set([...s].filter((i) => !set.has(i))));
  }

  // ---- ordering ------------------------------------------------------------
  move(id: string, parentId: string, index: number): void {
    this.commit(moveNode(this.doc(), id, parentId, index));
  }

  moveBy(id: string, delta: number): void {
    const loc = locate(this.doc(), id);
    if (!loc) return;
    const to = loc.index + delta;
    if (to < 0 || to >= loc.siblings.length) return;
    this.move(id, loc.parentId, to);
  }

  // ---- selection / clipboard ----------------------------------------------
  toggleSelect(id: string): void {
    this.selection.update((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  }

  clearSelection(): void {
    this.selection.set(new Set());
  }

  copySelected(): void {
    const nodes = topLevelSelected(this.doc(), this.selection());
    if (!nodes.length) return;
    this.clipboard.set(structuredClone(nodes));
    // Best-effort system clipboard so the structure can also be pasted as text elsewhere.
    navigator.clipboard?.writeText(JSON.stringify(nodes)).catch(() => undefined);
  }

  paste(): void {
    const clip = this.clipboard();
    if (!clip.length) return;
    const copies = clip.map((n) => cloneWithNewIds(n));
    const sel = topLevelSelected(this.doc(), this.selection());
    const anchor = sel.length ? locate(this.doc(), sel[sel.length - 1].id) : null;
    const next = anchor
      ? insertAt(this.doc(), anchor.parentId, anchor.index + 1, copies)
      : mapChildrenOf(this.doc(), this.targetPageId(), (c) => [...c, ...copies]);
    this.commit(next);
    this.selection.set(new Set(copies.map((c) => c.id)));
  }

  deleteSelected(): void {
    this.remove(topLevelSelected(this.doc(), this.selection()).map((n) => n.id));
  }

  // ---- test data -----------------------------------------------------------
  loadSample(sections = 20, perSection = 50): void {
    const children: FormNode[] = [];
    for (let s = 1; s <= sections; s++) {
      const sec = createSection();
      sec.title = `Section ${s}`;
      sec.collapsed = s > 2;
      sec.children = Array.from({ length: perSection }, (_, i) => {
        const q = createQuestion(i % 5 === 0 ? 'checkbox' : 'text');
        q.label = `Question ${s}.${i + 1}`;
        return q;
      });
      children.push(sec);
    }
    const page = createPage();
    page.children = children;
    this.commit({ ...this.doc(), pages: [page] });
    this.activePageId.set(page.id);
    this.clearSelection();
  }
}
