import type { ComponentType } from 'react';
import type { Task } from '../types/content';

export interface WorkspaceProps<T extends Task, A> {
  task: T;
  answer: A;
  onChange: (answer: A) => void;
  disabled: boolean;
}

/** Опис типу завдання: компонент робочої зони + функція перевірки */
export interface TaskTypeDef<T extends Task, A> {
  /** Назва типу для інтерфейсу */
  label: string;
  initialAnswer: (task: T) => A;
  /** Чи можна вже натиснути «Перевірити» */
  isAnswered: (answer: A, task: T) => boolean;
  check: (task: T, answer: A) => boolean;
  /** Необов'язкова підказка після неправильної спроби (без розкриття відповіді) */
  feedback?: (task: T, answer: A) => string | undefined;
  Workspace: ComponentType<WorkspaceProps<T, A>>;
}

export function sameSet(a: number[], b: number[]): boolean {
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
}
