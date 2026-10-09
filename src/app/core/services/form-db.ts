import { Injectable } from '@angular/core';
import { FormDoc } from '../models/form.model';

const DB_NAME = 'form-builder';
const STORE = 'forms';
const KEY = 'default';

/** Minimal promise wrapper over IndexedDB; every failure degrades to "no persistence". */
@Injectable({ providedIn: 'root' })
export class FormDb {
  private dbPromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    return (this.dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async load(): Promise<FormDoc | null> {
    try {
      return ((await this.run('readonly', (s) => s.get(KEY))) as FormDoc | undefined) ?? null;
    } catch {
      return null;
    }
  }

  async save(doc: FormDoc): Promise<void> {
    try {
      await this.run('readwrite', (s) => s.put(doc, KEY));
    } catch {
      /* storage unavailable (private mode / quota): keep working in memory */
    }
  }
}
