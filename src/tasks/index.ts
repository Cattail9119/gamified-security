// Реєстр типів завдань. Новий тип: компонент + перевірка у src/tasks/, тип у types/content.ts, запис тут.
import type { Task, TaskType } from '../types/content';
import type { TaskTypeDef } from './types';
import { multiChoice } from './multiChoice';
import { findInCode } from './findInCode';
import { textAnswer } from './textAnswer';
import { pickEmail } from './pickEmail';
import { inboxTriage } from './inboxTriage';
import { scenario } from './scenario';
import { passwordLab } from './passwordLab';
import { injectionSandbox } from './injectionSandbox';
import { fillSlots } from './fillSlots';
import { cipherLab } from './cipherLab';
import { hashCheck } from './hashCheck';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- тип відповіді в кожного типу свій
export type AnyTaskTypeDef = TaskTypeDef<any, any>;

// Mapped type: TypeScript не дасть забути зареєструвати новий тип
const registry: { [K in TaskType]: TaskTypeDef<Extract<Task, { type: K }>, any> } = {
  'multi-choice': multiChoice,
  'find-in-code': findInCode,
  'text-answer': textAnswer,
  'pick-email': pickEmail,
  'inbox-triage': inboxTriage,
  scenario,
  'password-lab': passwordLab,
  'injection-sandbox': injectionSandbox,
  'fill-slots': fillSlots,
  'cipher-lab': cipherLab,
  'hash-check': hashCheck,
};

/** undefined — якщо в JSON вказано невідомий тип */
export function getTaskTypeDef(task: Task): AnyTaskTypeDef | undefined {
  return (registry as Record<string, AnyTaskTypeDef>)[task.type];
}
