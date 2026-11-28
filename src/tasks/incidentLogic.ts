// Розгалужений сценарій інциденту з показниками стану об'єкта.
// Відповідь – індекси обраних варіантів уздовж шляху; сам шлях відтворюється з startStep.
// Чистий модуль без React – його перевіряють юніт-тести (tests/).
import type { IncidentChoice, IncidentSimTask, IncidentStep } from '../types/content';

export interface PathEntry {
  step: IncidentStep;
  choice?: IncidentChoice;
  /** Показники після цього кроку (або поточні, якщо вибору ще немає) */
  values: Record<string, number>;
}

export interface Playthrough {
  entries: PathEntry[];
  values: Record<string, number>;
  /** Сценарій дійшов до кінця */
  ended: boolean;
  /** Найнижче значення кожного показника за весь шлях */
  lowest: Record<string, number>;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function play(task: IncidentSimTask, answer: number[]): Playthrough {
  const values: Record<string, number> = Object.fromEntries(task.meters.map((m) => [m.id, m.start]));
  const lowest = { ...values };
  const entries: PathEntry[] = [];
  let stepId: string | undefined = task.startStep;
  let ended = false;
  for (let i = 0; stepId !== undefined; i++) {
    const step = task.steps.find((s) => s.id === stepId);
    if (!step) break;
    const choice: IncidentChoice | undefined = step.choices[answer[i]];
    if (!choice) {
      entries.push({ step, values: { ...values } });
      break;
    }
    for (const [id, d] of Object.entries(choice.effects)) {
      if (id in values) {
        values[id] = clamp(values[id] + d);
        lowest[id] = Math.min(lowest[id], values[id]);
      }
    }
    entries.push({ step, choice, values: { ...values } });
    stepId = choice.next;
    if (stepId === undefined) ended = true;
  }
  return { entries, values, ended, lowest };
}

/** Показники, що хоч раз опускалися нижче допустимого */
export function failedMeters(task: IncidentSimTask, p: Playthrough): string[] {
  return task.meters.filter((m) => p.lowest[m.id] < m.min).map((m) => m.id);
}

export const passed = (task: IncidentSimTask, answer: number[]) => {
  const p = play(task, answer);
  return p.ended && failedMeters(task, p).length === 0;
};
