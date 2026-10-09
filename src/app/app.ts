import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { FormStore } from './core/store/form-store';
import { PageComponent } from './features/builder/page';

@Component({
  selector: 'app-root',
  imports: [CdkDropListGroup, PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(FormStore);

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (!(e.ctrlKey || e.metaKey)) return;
    const t = e.target as HTMLInputElement;
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) && t.type !== 'checkbox';
    if (typing) return; // native text editing wins while typing
    const key = e.key.toLowerCase();
    if (key === 'z') {
      e.preventDefault();
      e.shiftKey ? this.store.redo() : this.store.undo();
    } else if (key === 'y') {
      e.preventDefault();
      this.store.redo();
    } else if (key === 'c' && this.store.selection().size) {
      e.preventDefault();
      this.store.copySelected();
    } else if (key === 'v') {
      e.preventDefault();
      this.store.paste();
    }
  }
}
