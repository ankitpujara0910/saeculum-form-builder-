import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, viewChild } from '@angular/core';
import { FormStore } from '../../core/store/form-store';
import { Question, QuestionType } from '../../core/models/form.model';

/**
 * The label + response-type cells of a question row. The host is `display: contents`
 * so both cells take part in the parent row's grid (handle | label | type | actions).
 */
@Component({
  selector: 'fb-question',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cell label-cell">
      <input
        #label
        type="text"
        aria-label="Question text"
        [value]="node().label"
        (focus)="store.activePageId.set(pageId())"
        (input)="store.update(node().id, { label: $any($event.target).value }, true)"
        (keydown.enter)="$event.preventDefault(); store.addQuestionAfter(node().id)"
        (keydown.alt.arrowup)="$event.preventDefault(); store.moveBy(node().id, -1); store.focusId.set(node().id)"
        (keydown.alt.arrowdown)="$event.preventDefault(); store.moveBy(node().id, 1); store.focusId.set(node().id)"
      />
    </div>
    <div class="cell type-cell">
      <span class="badge" [class.check]="node().type === 'checkbox'" aria-hidden="true">
        {{ node().type === 'checkbox' ? '✓' : 'T' }}
      </span>
      <select aria-label="Type of response" [value]="node().type" (change)="setType($any($event.target).value)">
        <option value="text">Text answer</option>
        <option value="checkbox">Checkbox</option>
      </select>
    </div>

    @if (node().type === 'checkbox') {
      <ul class="options">
        @for (opt of node().options; track $index) {
          <li>
            <span class="box" aria-hidden="true"></span>
            <input
              type="text"
              [attr.aria-label]="'Option ' + ($index + 1)"
              [value]="opt"
              (input)="setOption($index, $any($event.target).value)"
              (keydown.enter)="$event.preventDefault(); addOption()"
            />
            <button type="button" aria-label="Remove option" (click)="removeOption($index)">×</button>
          </li>
        }
        <li><button type="button" class="link" (click)="addOption()">+ Add option</button></li>
      </ul>
    }
  `,
  styles: `
    :host { display: contents; }
    .cell { min-width: 0; align-self: stretch; display: flex; align-items: center; }
    .label-cell input {
      width: 100%; min-width: 0; border: 0; background: transparent; font: inherit; color: inherit; padding: 0 8px; height: 100%; min-height: 40px;
    }
    .label-cell input:focus { outline: none; }
    .type-cell { border-left: 1px solid var(--line); padding: 0 12px; gap: 8px; }
    .badge {
      flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      font-size: 12px; font-weight: 700; color: var(--danger); background: var(--danger-bg);
    }
    .badge.check { color: #fff; background: var(--success); border-radius: 5px; }
    select {
      flex: 1; min-width: 0; appearance: none; border: 0; background: transparent; font: inherit; font-size: 13px;
      color: inherit; height: 100%; min-height: 40px; cursor: pointer; padding-right: 18px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 2px center;
    }
    select:focus-visible { outline: 2px solid var(--accent); }
    option { color: #1b1d24; }
    /* Checkbox options only show while the row is being edited, so the resting row matches the design. */
    .options { grid-column: 2 / 4; list-style: none; margin: 0; padding: 4px 8px 8px; display: none; gap: 6px; }
    :host-context(.row:focus-within) .options { display: grid; }
    .options li { display: flex; align-items: center; gap: 8px; }
    .options input { flex: 1; min-width: 0; font: inherit; font-size: 13px; padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: inherit; }
    .options button { border: 0; background: none; color: var(--muted); cursor: pointer; min-width: 28px; min-height: 28px; }
    .options .link { color: var(--accent); font: inherit; font-size: 13px; text-align: left; }
    .box { width: 14px; height: 14px; border: 2px solid var(--muted); border-radius: 3px; flex: none; }
    @media (max-width: 600px) {
      .type-cell { padding: 0 4px; gap: 4px; }
      .badge { display: none; }
      select { font-size: 12px; }
    }
  `,
})
export class QuestionComponent {
  readonly node = input.required<Question>();
  readonly pageId = input.required<string>();
  protected readonly store = inject(FormStore);
  private readonly labelEl = viewChild.required<ElementRef<HTMLInputElement>>('label');

  constructor() {
    effect(() => {
      if (this.store.focusId() === this.node().id) {
        this.labelEl().nativeElement.focus();
        this.store.focusId.set(null);
      }
    });
  }

  protected setType(type: QuestionType): void {
    const q = this.node();
    this.store.update(q.id, { type, options: type === 'checkbox' && !q.options.length ? ['Option 1'] : q.options });
  }

  protected setOption(i: number, value: string): void {
    const options = this.node().options.map((o, idx) => (idx === i ? value : o));
    this.store.update(this.node().id, { options }, true);
  }

  protected addOption(): void {
    this.store.update(this.node().id, { options: [...this.node().options, `Option ${this.node().options.length + 1}`] });
  }

  protected removeOption(i: number): void {
    this.store.update(this.node().id, { options: this.node().options.filter((_, idx) => idx !== i) });
  }
}
