import { TestBed } from '@angular/core/testing';
import { FormDb } from './core/services/form-db';
import { FormStore } from './core/store/form-store';
import { locate } from './core/store/form-ops';

const setup = () => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: FormDb, useValue: { load: async () => null, save: async () => undefined } }],
  });
  return TestBed.inject(FormStore);
};

describe('FormStore', () => {
  let store: FormStore;

  beforeEach(() => {
    store = setup();
    store.addPage();
  });

  const page = () => store.activePage()!;

  it('starts empty and creates a page when a question is added first', () => {
    const fresh = setup();
    expect(fresh.doc().pages.length).toBe(0);
    fresh.addQuestion();
    expect(fresh.doc().pages.length).toBe(1);
    expect(fresh.totalQuestions()).toBe(1);
  });

  it('adds a question after the current one (Enter behaviour)', () => {
    const first = page().children[0].id;
    store.addQuestionAfter(first);
    expect(page().children.length).toBe(2);
    expect(page().children[0].id).toBe(first);
  });

  it('nests sections and moves a question into one', () => {
    store.addSection();
    const outer = page().children[1];
    store.addSection(outer.id);
    const q = page().children[0].id;
    store.move(q, outer.id, 0);
    expect(locate(store.doc(), q)?.parentId).toBe(outer.id);
  });

  it('moves an item between pages', () => {
    store.addPage();
    const [p1, p2] = store.doc().pages;
    const q = p1.children[0].id;
    store.move(q, p2.id, 0);
    expect(locate(store.doc(), q)?.parentId).toBe(p2.id);
  });

  it('refuses to move a section into itself', () => {
    store.addSection();
    const sec = page().children[1];
    store.addSection(sec.id);
    const inner = (locate(store.doc(), sec.id)!.node as any).children.at(-1).id;
    store.move(sec.id, inner, 0);
    expect(locate(store.doc(), sec.id)?.parentId).toBe(page().id);
  });

  it('copies and pastes a nested section with fresh ids', () => {
    store.addSection();
    const sec = page().children[1];
    store.toggleSelect(sec.id);
    store.copySelected();
    store.paste();
    const kids = page().children;
    expect(kids.length).toBe(3);
    expect(kids[2].id).not.toBe(sec.id);
    expect((kids[2] as any).children[0].id).not.toBe((sec as any).children[0].id);
  });

  it('undoes and redoes', () => {
    store.addQuestion();
    expect(page().children.length).toBe(2);
    store.undo();
    expect(page().children.length).toBe(1);
    store.redo();
    expect(page().children.length).toBe(2);
  });

  it('builds a 1,000 question form', () => {
    store.loadSample();
    expect(store.totalQuestions()).toBe(1000);
  });
});
