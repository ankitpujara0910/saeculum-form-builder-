import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormStore } from '../../core/store/form-store';
import { FormPage } from '../../core/models/form.model';
import { NodeListComponent } from './node-list';

@Component({
  selector: 'fb-page',
  imports: [NodeListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" [attr.aria-label]="'Page ' + index()" (focusin)="store.activePageId.set(page().id)">
      <header class="head">
        <button
          type="button"
          class="chev"
          [attr.aria-expanded]="!page().collapsed"
          [attr.aria-label]="page().collapsed ? 'Expand page' : 'Collapse page'"
          (click)="store.updatePage(page().id, { collapsed: !page().collapsed })"
        >
          <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" [class.closed]="page().collapsed"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        </button>
        <span class="num">{{ index() }}-</span>
        <input
          class="title"
          type="text"
          aria-label="Page title"
          [value]="page().title"
          (input)="store.updatePage(page().id, { title: $any($event.target).value }, true)"
        />
        <svg class="edit" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.3" d="M11 2.5l2.5 2.5L6 12.5 2.5 13.5 3.5 10zM2.5 14.5h11"/></svg>

        <div class="menu-wrap">
          <button type="button" class="dots" aria-label="Page options" aria-haspopup="menu" [attr.aria-expanded]="menu()" (click)="menu.set(!menu())">⋮</button>
          @if (menu()) {
            <div class="menu" role="menu" (keydown.escape)="menu.set(false)">
              <button type="button" role="menuitem" (click)="menu.set(false); store.duplicatePage(page().id)">Duplicate page</button>
              <button type="button" role="menuitem" class="del" (click)="menu.set(false); store.removePage(page().id)">Delete page</button>
            </div>
          }
        </div>
      </header>

      @if (!page().collapsed) {
        <input
          class="desc"
          type="text"
          aria-label="Page description"
          [value]="page().description"
          (input)="store.updatePage(page().id, { description: $any($event.target).value }, true)"
        />
        <div class="cols" aria-hidden="true"><span>Question</span><span>Types of responses</span></div>
        <fb-node-list [parentId]="page().id" [nodes]="page().children" [pageId]="page().id" />
      }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .page { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; margin-bottom: 14px; }
    .page:focus-within { border-color: var(--accent); }
    .head { display: flex; align-items: center; gap: 8px; padding: 10px 14px 0; }
    .chev { flex: none; border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; display: grid; }
    .chev svg.closed { transform: rotate(-90deg); }
    .num, .title { font-weight: 700; font-size: 15px; }
    .num { margin-right: -4px; }
    .title { border: 0; background: transparent; color: inherit; font-family: inherit; min-width: 40px; width: 120px; flex: 0 1 auto; padding: 4px; }
    .title:focus { outline: 2px solid var(--accent); border-radius: 4px; }
    .edit { color: var(--accent); flex: none; }
    .menu-wrap { margin-left: auto; position: relative; }
    .dots { border: 0; background: none; font-size: 20px; cursor: pointer; color: var(--ink); padding: 2px 8px; border-radius: 4px; }
    .dots:hover { background: var(--hover); }
    .menu { position: absolute; right: 0; top: 100%; z-index: 20; min-width: 150px; display: grid; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 6px 20px rgb(0 0 0 / 0.16); padding: 4px; }
    .menu button { border: 0; background: none; font: inherit; font-size: 13px; text-align: left; padding: 7px 10px; border-radius: 4px; cursor: pointer; color: var(--ink); }
    .menu button:hover { background: var(--hover); }
    .menu .del { color: var(--danger); }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    .desc { display: block; width: 100%; min-width: 0; border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 12px; padding: 2px 14px 8px 48px; }
    .desc:focus { outline: none; color: var(--ink); }
    .cols { display: grid; grid-template-columns: 28px minmax(0, 1fr) minmax(150px, 260px) 64px; font-size: 11px; color: var(--muted); border-bottom: 1px solid var(--ink-line); }
    .cols span { padding: 4px 8px; }
    .cols span:first-child { grid-column: 2; }
    .cols span:last-child { grid-column: 3; padding-left: 12px; }
    @media (max-width: 600px) {
      .cols { grid-template-columns: 24px minmax(0, 1fr) minmax(96px, 120px) 56px; }
      .head { padding: 8px 8px 0; }
      .desc { padding-left: 12px; }
      .title { width: 90px; }
    }
  `,
})
export class PageComponent {
  readonly page = input.required<FormPage>();
  readonly index = input.required<number>();
  protected readonly store = inject(FormStore);
  protected readonly menu = signal(false);
}
