import { InlineText } from '../components/RichText';
import type { MatchingTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

/** answer[i] – індекс у task.right для task.left[i] */
type Answer = (number | null)[];

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<MatchingTask, Answer>) {
  const used = new Set(answer.filter((x): x is number => x !== null));
  const extra = task.right.length - task.left.length;
  return (
    <>
      <p className="note">
        Для кожного рядка ліворуч оберіть відповідник.
        {extra > 0 && ` Серед варіантів є зайві: ${extra}.`}
      </p>
      <div className="match">
        {(task.leftLabel || task.rightLabel) && (
          <div className="match-head" aria-hidden>
            <span>{task.leftLabel}</span>
            <span>{task.rightLabel}</span>
          </div>
        )}
        {task.left.map((l, i) => {
          const v = answer[i];
          return (
            <div className={`match-row${v !== null ? ' filled' : ''}`} key={i}>
              <div className="match-left">
                <span className="match-num mono" aria-hidden>{i + 1}</span>
                <span id={`m-${task.id}-${i}`}><InlineText text={l} /></span>
              </div>
              <select
                className="slot match-select"
                aria-labelledby={`m-${task.id}-${i}`}
                value={v ?? ''}
                disabled={disabled}
                onChange={(e) => {
                  const nv = e.target.value === '' ? null : Number(e.target.value);
                  onChange(answer.map((x, j) => (j === i ? nv : x)));
                }}
              >
                <option value="">– обрати –</option>
                {task.right.map((r, k) => (
                  <option key={k} value={k}>
                    {r.replace(/\*\*|`/g, '')}
                    {used.has(k) && v !== k ? ' · вже обрано' : ''}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </>
  );
}

const correctCount = (task: MatchingTask, a: Answer) => task.pairs.filter((p, i) => a[i] === p).length;

export const matching: TaskTypeDef<MatchingTask, Answer> = {
  label: 'Зіставлення',
  initialAnswer: (task) => task.left.map(() => null),
  isAnswered: (a) => a.every((x) => x !== null),
  check: (task, a) => correctCount(task, a) === task.left.length,
  feedback: (task, a) => `Правильних пар: ${correctCount(task, a)} з ${task.left.length}.`,
  Workspace,
};
