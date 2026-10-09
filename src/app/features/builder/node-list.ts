import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, viewChild } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { FormStore } from '../../core/store/form-store';
import { DropRegistry } from '../../core/services/drop-registry';
import { FormNode } from '../../core/models/form.model';
import { QuestionComponent } from './question';

/** Last known pointer position (mouse, pen or touch), used to pick the innermost drop list. */
const pointer = { x: 0, y: 0 };
if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { capture: true, passive: true },
  );
}

/** Renders a list of questions/sections; recursive for nested sections. */
@Component({
  selector: 'fb-node-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, QuestionComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="list"
      cdkDropList
      [cdkDropListData]="parentId()"
      [cdkDropListConnectedTo]="connected()"
      [cdkDropListEnterPredicate]="canEnter"
      (cdkDropListDropped)="drop($event)"
      role="list"
    >
      @for (n of nodes(); track n.id) {
        <div
          class="node"
          role="listitem"
          cdkDrag
          (cdkDragMoved)="refreshDropAreas()"
          [cdkDragData]="n.id"
          [cdkDragDisabled]="n.kind === 'section' && !n.collapsed"
          [class.selected]="store.selection().has(n.id)"
        >
          @if (n.kind === 'question') {
            <div class="row question" (click)="onRowClick($event, n.id)">
              <span class="handle" cdkDragHandle title="Drag to move" aria-hidden="true">⠿</span>
              <fb-question [node]="n" [pageId]="pageId()" />
              <div class="end">
                <ng-container *ngTemplateOutlet="actions; context: { $implicit: n }" />
              </div>
              @if (n.label) {
                <div class="pop" role="group" aria-label="Add after this question">
                  <button type="button" (click)="store.addQuestionAfter(n.id)">+ Question</button>
                  <button type="button" (click)="store.addSectionAfter(n.id)">Section</button>
                </div>
              }
            </div>
          } @else {
            <div class="row section-head" (click)="onRowClick($event, n.id)">
              <span
                class="handle"
                cdkDragHandle
                [attr.title]="n.collapsed ? 'Drag to move' : 'Collapse the section to drag it'"
                aria-hidden="true"
                >⠿</span
              >
              <div class="section-main">
                <button
                  type="button"
                  class="chev"
                  [attr.aria-expanded]="!n.collapsed"
                  [attr.aria-label]="n.collapsed ? 'Expand section' : 'Collapse section'"
                  (click)="store.setCollapsed(n.id, !n.collapsed)"
                >
                  <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" [class.closed]="n.collapsed"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
                </button>
                <span class="num">{{ numbers().get(n.id) }}.</span>
                <input
                  class="title"
                  type="text"
                  aria-label="Section title"
                  [value]="n.title"
                  (focus)="store.activePageId.set(pageId())"
                  (input)="store.update(n.id, { title: $any($event.target).value }, true)"
                  (keydown.alt.arrowup)="$event.preventDefault(); store.moveBy(n.id, -1)"
                  (keydown.alt.arrowdown)="$event.preventDefault(); store.moveBy(n.id, 1)"
                />
              </div>
              <div class="end">
                <ng-container *ngTemplateOutlet="actions; context: { $implicit: n }" />
              </div>
              <div class="pop" role="group" aria-label="Add to section">
                <button type="button" (click)="store.addQuestion(n.id)">+ Question</button>
                <button type="button" (click)="store.addSection(n.id)">Section</button>
              </div>
            </div>
            @if (!n.collapsed) {
              <div class="children">
                <fb-node-list [parentId]="n.id" [nodes]="n.children" [pageId]="pageId()" />
              </div>
            }
          }
        </div>
      }
    </div>

    <ng-template #actions let-n>
      <input
        type="checkbox"
        class="sel"
        [checked]="store.selection().has(n.id)"
        (change)="store.toggleSelect(n.id)"
        [attr.aria-label]="'Select ' + n.kind"
      />
      <button type="button" class="trash" [attr.aria-label]="'Delete ' + n.kind" (click)="store.remove([n.id])">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5.5 1h5l.5 1.5H14V4H2V2.5h3zM3 5h10l-.7 9.1a1 1 0 0 1-.9.9H4.6a1 1 0 0 1-.9-.9z"/></svg>
      </button>
    </ng-template>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .list { min-height: 8px; }
    .node { content-visibility: auto; contain-intrinsic-size: auto 41px; }
    .row {
      position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) minmax(150px, 260px) 64px;
      align-items: stretch; min-height: 40px; background: var(--surface); border-bottom: 1px solid var(--line);
    }
    .row:focus-within { background: var(--row-focus); }
    .node.selected > .row { background: var(--row-selected); box-shadow: inset 2px 0 0 var(--accent); }
    .handle { display: grid; place-items: center; color: var(--muted); cursor: grab; touch-action: none; user-select: none; font-size: 14px; }
    .end { display: flex; align-items: center; border-left: 1px solid var(--line); }
    .sel { margin: 0 2px 0 8px; opacity: 0; cursor: pointer; }
    .row:hover .sel, .sel:checked, .sel:focus-visible { opacity: 1; }
    .trash { border: 0; background: none; color: var(--danger); cursor: pointer; flex: 1; height: 100%; min-height: 38px; }
    .trash:hover { background: var(--danger-bg); }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

    .section-head { grid-template-columns: 28px minmax(0, 1fr) 64px; background: var(--section-bg); }
    .section-head:focus-within { background: var(--section-bg); }
    .section-main { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 0 8px; }
    .chev { flex: none; width: 20px; height: 20px; border-radius: 50%; border: 0; background: var(--chev-bg); color: var(--accent); display: grid; place-items: center; cursor: pointer; padding: 0; }
    .chev svg.closed { transform: rotate(-90deg); }
    .num, .title { font-weight: 700; font-size: 13px; }
    .title { flex: 1; min-width: 0; border: 0; background: transparent; color: inherit; font-family: inherit; height: 100%; min-height: 38px; }
    .title:focus { outline: none; }
    .children { margin-left: 22px; padding-left: 8px; border-left: 1px dotted var(--muted); }

    /* "+ Question | Section" popover, shown inside the focused row (so it is never clipped) */
    .pop {
      display: none; position: absolute; right: calc(min(260px, 100%) + 72px); top: 50%; transform: translateY(-50%); z-index: 5;
      gap: 2px; padding: 3px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px;
      box-shadow: 0 4px 14px rgb(0 0 0 / 0.14);
    }
    .row:focus-within > .pop { display: flex; }
    .pop button { border: 0; background: none; font: inherit; font-size: 11px; color: var(--ink); padding: 3px 8px; border-radius: 4px; cursor: pointer; white-space: nowrap; min-height: 22px; }
    .pop button:hover { background: var(--hover); }

    .cdk-drag-preview { box-shadow: 0 8px 24px rgb(0 0 0 / 0.2); background: var(--surface); }
    .cdk-drag-placeholder { opacity: 0.35; }
    .cdk-drag-animating { transition: transform 200ms cubic-bezier(0, 0, 0.2, 1); }
    .list.cdk-drop-list-dragging .node:not(.cdk-drag-placeholder) { transition: transform 200ms cubic-bezier(0, 0, 0.2, 1); }

    @media (max-width: 600px) {
      .row { grid-template-columns: 24px minmax(0, 1fr) minmax(96px, 120px) 56px; }
      .section-head { grid-template-columns: 24px minmax(0, 1fr) 56px; }
      .children { margin-left: 8px; padding-left: 4px; }
      .pop { right: 150px; }
      .sel { margin-left: 4px; }
    }
  `,
})
export class NodeListComponent {
  readonly parentId = input.required<string>();
  readonly nodes = input.required<FormNode[]>();
  /** Page that owns this list (so edits here make it the target of the bottom add buttons). */
  readonly pageId = input.required<string>();
  protected readonly store = inject(FormStore);
  private readonly registry = inject(DropRegistry);
  private readonly dropList = viewChild.required(CdkDropList);
  private refreshQueued = false;

  /** All other drop lists, so items can move between pages, sections and nested sections. */
  protected readonly connected = computed(() => this.registry.lists().filter((l) => l !== this.dropList()));

  constructor() {
    effect((onCleanup) => {
      const list = this.dropList();
      this.registry.add(list);
      onCleanup(() => this.registry.remove(list));
    });
  }

  /**
   * CDK measures every drop list once, when a drag starts. Rows shift while dragging, so a nested list
   * (which moves with its section) would be tested at a stale position. Re-measure once per frame.
   */
  protected refreshDropAreas(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      for (const list of this.registry.lists()) {
        (list as unknown as { _dropListRef: { _cacheParentPositions(): void } })._dropListRef._cacheParentPositions();
      }
    });
  }

  /** "1., "2." ... numbering of sections among their siblings. */
  protected readonly numbers = computed(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const n of this.nodes()) if (n.kind === 'section') map.set(n.id, ++i);
    return map;
  });

  /**
   * Nested lists sit inside their parent's bounds, and CDK hands the item to the first connected list that
   * contains the pointer (the outermost). Only let a list accept the item when it is the innermost list under the pointer.
   */
  protected readonly canEnter = (_drag: CdkDrag, drop: CdkDropList): boolean => {
    const inner = document.elementFromPoint(pointer.x, pointer.y)?.closest('.list');
    return !inner || inner === drop.element.nativeElement;
  };

  protected drop(e: CdkDragDrop<string, string, string>): void {
    this.store.move(e.item.data, e.container.data, e.currentIndex);
  }

  /** Ctrl/Cmd/Shift + click toggles selection for copy/paste. */
  protected onRowClick(e: MouseEvent, id: string): void {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      this.store.toggleSelect(id);
    }
  }
}
