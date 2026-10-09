import { FormDoc, FormNode, FormPage, Section } from '../models/form.model';

/** Pure, immutable helpers. Unchanged branches keep their references (cheap undo snapshots, OnPush-friendly). */

function mapNodes(nodes: FormNode[], fn: (n: FormNode) => FormNode | null): FormNode[] {
  let changed = false;
  const out: FormNode[] = [];
  for (const n of nodes) {
    let cur: FormNode = n;
    if (n.kind === 'section') {
      const kids = mapNodes(n.children, fn);
      if (kids !== n.children) cur = { ...n, children: kids };
    }
    const r = fn(cur);
    if (r !== n) changed = true;
    if (r) out.push(r);
  }
  return changed ? out : nodes;
}

function mapPages(doc: FormDoc, fn: (p: FormPage) => FormPage): FormDoc {
  const pages = doc.pages.map(fn);
  return pages.some((p, i) => p !== doc.pages[i]) ? { ...doc, pages } : doc;
}

export function mapChildrenOf(doc: FormDoc, parentId: string, fn: (c: FormNode[]) => FormNode[]): FormDoc {
  return mapPages(doc, (page) => {
    if (page.id === parentId) return { ...page, children: fn(page.children) };
    const kids = mapNodes(page.children, (n) =>
      n.kind === 'section' && n.id === parentId ? { ...n, children: fn(n.children) } : n,
    );
    return kids === page.children ? page : { ...page, children: kids };
  });
}

export function patchNode(doc: FormDoc, id: string, patch: Partial<FormNode>): FormDoc {
  return mapPages(doc, (page) => {
    const kids = mapNodes(page.children, (n) => (n.id === id ? ({ ...n, ...patch } as FormNode) : n));
    return kids === page.children ? page : { ...page, children: kids };
  });
}

export function removeNodes(doc: FormDoc, ids: ReadonlySet<string>): FormDoc {
  return mapPages(doc, (page) => {
    const kids = mapNodes(page.children, (n) => (ids.has(n.id) ? null : n));
    return kids === page.children ? page : { ...page, children: kids };
  });
}

export interface Location {
  parentId: string;
  index: number;
  siblings: FormNode[];
  node: FormNode;
}

export function locate(doc: FormDoc, id: string): Location | null {
  const search = (parentId: string, nodes: FormNode[]): Location | null => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) return { parentId, index: i, siblings: nodes, node: n };
      if (n.kind === 'section') {
        const r = search(n.id, n.children);
        if (r) return r;
      }
    }
    return null;
  };
  for (const p of doc.pages) {
    const r = search(p.id, p.children);
    if (r) return r;
  }
  return null;
}

export function contains(section: Section, id: string): boolean {
  return section.children.some((c) => c.id === id || (c.kind === 'section' && contains(c, id)));
}

export function insertAt(doc: FormDoc, parentId: string, index: number, nodes: FormNode[]): FormDoc {
  return mapChildrenOf(doc, parentId, (c) => {
    const i = Math.max(0, Math.min(index, c.length));
    return [...c.slice(0, i), ...nodes, ...c.slice(i)];
  });
}

export function moveNode(doc: FormDoc, id: string, parentId: string, index: number): FormDoc {
  const loc = locate(doc, id);
  if (!loc) return doc;
  if (loc.node.kind === 'section' && (loc.node.id === parentId || contains(loc.node, parentId))) return doc;
  return insertAt(removeNodes(doc, new Set([id])), parentId, index, [loc.node]);
}

/** Selected nodes in document order, skipping nodes already covered by a selected ancestor. */
export function topLevelSelected(doc: FormDoc, ids: ReadonlySet<string>): FormNode[] {
  const out: FormNode[] = [];
  const walk = (nodes: FormNode[]) => {
    for (const n of nodes) {
      if (ids.has(n.id)) out.push(n);
      else if (n.kind === 'section') walk(n.children);
    }
  };
  doc.pages.forEach((p) => walk(p.children));
  return out;
}

export function countQuestions(nodes: FormNode[]): number {
  let c = 0;
  for (const n of nodes) c += n.kind === 'section' ? countQuestions(n.children) : 1;
  return c;
}
