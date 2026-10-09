# Saeculum Form Builder

A dynamic form builder built with **Angular 22**, **Angular CDK drag-and-drop**, **signals** and **IndexedDB**.
Users create multi-page forms from text and checkbox questions, organised in nested, collapsible sections, and can
rearrange, copy/paste and undo/redo everything. Forms are saved in the browser (IndexedDB) and restored on reload.

## Contents

1. [Quick start](#quick-start)
2. [How to use (use cases)](#how-to-use-use-cases)
3. [Requirements checklist](#requirements-checklist)
4. [Keyboard shortcuts](#keyboard-shortcuts)
5. [Tech stack and project structure](#tech-stack-and-project-structure)
6. [Design notes](#design-notes)
7. [Testing](#testing)
8. [Known limitations](#known-limitations)

## Quick start

Prerequisites: Node.js 20.19+ or 22+, npm 10+.

```bash
npm install
npm start                      # ng serve, then open http://localhost:4200
```

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npx ng test --watch=false` | Unit tests (Vitest), single run |

## How to use (use cases)

### 1. Start a form
The app opens on the **Initial Screen**: an empty canvas with three buttons, **+ Question**, **Section** and **Add Page**.
Click any of them and a first page is created for you. (The toolbar with Undo/Redo, Copy/Paste and the 1,000-question
test button appears once the form has a page.)

### 2. Add pages (wizard-style form)
- Click **Add Page** to add `1- Page`, `2- Page`, ... Each page has an editable title (✎), a description line and a collapse
  chevron. The **⋮** menu duplicates or deletes the page.
- Drag a question or section onto another page to move it there.

### 3. Add questions
- Click **+ Question** (adds to the active page), **or** press **Enter** inside a question to create a new one directly below it.
- When a question has text and is focused, a small **+ Question | Section** popover appears beside it to add another item after it.
- **Text answer** is the default type. Use the *Types of responses* dropdown to switch a question to **Checkbox**; while the
  row is focused you can edit its checkbox options (Enter adds an option).

### 4. Use sections (nested and collapsible)
- Click **Section** to add a section. Inside a section's popover use **+ Question** or **Section** to add questions or a
  nested section (any depth). Sections are numbered `1.`, `2.` within their parent.
- Click the round chevron to collapse or expand a section.

### 5. Rearrange with drag and drop
- Drag any row by its **⠿** handle to reorder it, move it into or out of a section, or move it to another page. The list
  makes room in real time.
- **Sections can only be dragged while collapsed** (collapse the section first). A section cannot be dropped into itself.
- Keyboard alternative: focus a question or section title and press **Alt + ↑ / ↓**.
- Works with touch on phones and tablets.

### 6. Copy and paste
- Select rows with **Ctrl/Shift + click** on a row, or tick the checkbox that appears on hover. You can select several
  questions and sections.
- Press **Ctrl/Cmd + C** (or the **Copy** button), then click where you want the copy and press **Ctrl/Cmd + V** (**Paste**).
  Pasted sections keep all their nested questions and sections. Paste goes after the last selected item, or at the end of the active page.

### 7. Edit and delete
- Type directly in any question, section title, page title or description.
- Use the red trash button on a row to delete a question or section (a section deletes its contents). **Delete selected**
  in the toolbar deletes the current selection.

### 8. Undo and redo
- **Undo / Redo** buttons in the toolbar, or Ctrl/Cmd + Z and Ctrl/Cmd + Y. Covers adding, deleting, moving, editing and pasting
  (up to 100 steps). Typing in one field counts as one step. Collapsing is not recorded.

### 9. Saving
Every change is saved automatically to IndexedDB. Reload the page and your form comes back.

### 10. Try a large form
Once the form has a page, click **1,000 questions** in the toolbar to replace the form with 20 sections of 50 questions
and check scrolling, expanding and dragging.

## Requirements checklist

Status of each point in the *Angular Task - Form Builder* brief. "Verified" means exercised in Chrome with automated browser tests
(mouse, keyboard and touch emulation) and unit tests.

| Requirement | Status |
| --- | --- |
| Pages (wizard-style), add multiple pages | Done. Verified |
| Move questions and sections between pages by drag and drop | Done. Verified |
| Enter creates a new question below | Done. Verified |
| Add Question button and popover menu | Done |
| Simple text answer question (default type) | Done |
| Checkbox question | Done. Verified |
| Nested sections | Done. Verified |
| Collapsible sections | Done. Verified |
| Drag and drop of questions within parent and child sections | Done. Verified |
| Draggable top-level and nested sections, only when collapsed | Done. Verified |
| Copy/paste of multiple questions and sections (incl. nested) | Done. Verified |
| Add, delete and edit questions and sections | Done. Verified |
| Undo/redo (optional bonus) | Done. Verified |
| IndexedDB used to store form data | Done. Verified (survives reload) |
| Large forms (1,000+ questions) stay smooth | Done. Verified in Chrome: about 0.5 s to expand all 1,000 rows, about 15 ms to edit one question |
| Mobile responsiveness, drag and drop on mobile | Layout verified at 390 px (no horizontal scroll) and touch drag verified with emulation. Real devices not yet tried |
| Keyboard navigation and screen-reader support | Keyboard: done and verified (Enter, Alt+Arrows, shortcuts, focus rings). Screen-reader support: labels and ARIA attributes added, not yet tested with a screen reader |
| Cross-browser (Chrome, Firefox, Edge, Safari) | Verified in Chrome only |
| Design implementation (margins, colours, typography) | Matched by eye from the Figma frames. Exact Figma values could not be read (see limitations) |

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Enter` (in a question) | Add a new question below |
| `Enter` (in a checkbox option) | Add a new option |
| `Alt + ↑` / `Alt + ↓` (in a question or section title) | Move it up / down within its list |
| `Ctrl/Cmd + Z` | Undo (when not typing in a field) |
| `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z` | Redo (when not typing in a field) |
| `Ctrl/Cmd + C` / `Ctrl/Cmd + V` | Copy / paste selected items (when not typing in a field) |
| `Ctrl/Shift + click` on a row | Select / deselect it |

## Tech stack and project structure

Angular 22 (standalone components, signals, `OnPush`), Angular CDK drag-and-drop, IndexedDB, Vitest.

```
src/app/
  app.ts / app.html / app.css      Shell: toolbar, pages, add buttons, global shortcuts
  core/
    models/form.model.ts           Types (Page > Section > Question) and factory helpers
    store/form-ops.ts              Pure, immutable tree operations (insert, move, patch, remove, locate)
    store/form-store.ts            Signal-based state: pages, selection, clipboard, undo/redo, persistence
    services/form-db.ts            IndexedDB wrapper
    services/drop-registry.ts      Registry that connects all drop lists (including nested ones)
  features/builder/
    page.ts                        Page card: header, description, column headings, menu
    node-list.ts                   Recursive rows for questions/sections with drag-and-drop
    question.ts                    Question label + response-type cells (text / checkbox)
```

## Design notes

- **Data model:** `FormDoc -> FormPage[] -> (Question | Section)[]`, where a section holds more nodes, giving unlimited nesting.
- **Immutable updates with structural sharing:** every edit returns a new tree that reuses unchanged branches. Undo history is just a list of document references (cheap), and `OnPush` components only re-render the parts that changed.
- **Large-form performance:** `OnPush` everywhere, `track` by id, collapsed sections do not render their children, and `content-visibility: auto` lets the browser skip rendering off-screen rows.
- **Drag and drop:** one drop list per level (page roots and every expanded section). CDK's `cdkDropListGroup` does not reach nested lists, so `DropRegistry` connects them explicitly, and drop areas are re-measured while dragging because rows shift. One `move(id, parentId, index)` operation handles reordering, moving into or out of sections, and moving between pages. A section cannot be dropped into itself or its descendants.
- **Persistence:** IndexedDB database `form-builder`, object store `forms`, key `default`. Data saved by an older layout (pages without a description) is ignored, so the app starts on the Initial Screen. If IndexedDB is unavailable the app keeps working in memory.

## Testing

`npx ng test --watch=false` runs unit tests for the store: empty start, Enter-to-add, nesting, moving between pages, preventing a section from moving into itself, copy/paste with fresh ids, undo/redo and a 1,000-question form.

Manual checks worth repeating before release:

1. Click **1,000 questions**, then scroll, expand/collapse sections and drag items.
2. Select several questions and a section, copy, then paste at another location.
3. Reload the page and confirm the form is restored from IndexedDB.
4. Resize to phone width and drag using touch (or device emulation) on a real device.
5. Repeat in Chrome, Firefox, Edge and Safari, and with a screen reader.

## Known limitations

- Styling follows the Figma frames (layout, colours, icons) by eye; exact pixel values could not be read from the Figma file.
- Verified in Chrome only; Firefox, Edge, Safari, real touch devices and screen readers still need a manual pass.
- Checkbox options are edited inline and only shown while the row is focused (the design shows a single line per question).
- Only one form is stored (key `default`); there is no export or respondent view.
