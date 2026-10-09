import { Injectable, signal } from '@angular/core';
import type { CdkDropList } from '@angular/cdk/drag-drop';

/**
 * Every rendered drop list (page roots and nested sections). CDK's `cdkDropListGroup` deliberately does not
 * reach into nested lists, so lists are connected explicitly through this registry instead.
 */
@Injectable({ providedIn: 'root' })
export class DropRegistry {
  readonly lists = signal<readonly CdkDropList[]>([]);

  add(list: CdkDropList): void {
    this.lists.update((l) => [...l, list]);
  }

  remove(list: CdkDropList): void {
    this.lists.update((l) => l.filter((x) => x !== list));
  }
}
