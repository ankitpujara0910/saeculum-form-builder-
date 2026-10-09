export type QuestionType = 'text' | 'checkbox';

export interface Question {
  kind: 'question';
  id: string;
  type: QuestionType;
  label: string;
  /** Checkbox options (only used when type === 'checkbox'). */
  options: string[];
}

export interface Section {
  kind: 'section';
  id: string;
  title: string;
  collapsed: boolean;
  children: FormNode[];
}

export type FormNode = Question | Section;

export interface FormPage {
  id: string;
  title: string;
  description: string;
  collapsed: boolean;
  children: FormNode[];
}

export interface FormDoc {
  id: string;
  pages: FormPage[];
}

export const newId = (): string => crypto.randomUUID();

export const createQuestion = (type: QuestionType = 'text'): Question => ({
  kind: 'question',
  id: newId(),
  type,
  label: '',
  options: type === 'checkbox' ? ['Option 1'] : [],
});

export const createSection = (): Section => ({
  kind: 'section',
  id: newId(),
  title: 'Section',
  collapsed: false,
  children: [createQuestion()],
});

export const DEFAULT_PAGE_DESCRIPTION =
  'The header is the first page of your report. The user is asked to select an entity if multiple ones exist and if no schedule is set.';

export const createPage = (): FormPage => ({
  id: newId(),
  title: 'Page',
  description: DEFAULT_PAGE_DESCRIPTION,
  collapsed: false,
  children: [createQuestion()],
});

/** A new form starts empty (matches the "Initial Screen" design). */
export const createForm = (): FormDoc => ({ id: 'default', pages: [] });

/** Deep clone with fresh ids (used by copy/paste). */
export function cloneWithNewIds<T extends FormNode>(node: T): T {
  const copy = structuredClone(node) as FormNode;
  const walk = (n: FormNode) => {
    n.id = newId();
    if (n.kind === 'section') n.children.forEach(walk);
  };
  walk(copy);
  return copy as T;
}
