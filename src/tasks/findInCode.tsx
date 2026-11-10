import type { FindInCodeTask } from '../types/content';
import { sameSet, type TaskTypeDef, type WorkspaceProps } from './types';

function plural(n: number, one: string, few: string, many: string) {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<FindInCodeTask, number[]>) {
  const lines = Array.isArray(task.code) ? task.code : task.code.split('\n');
  const toggle = (n: number) => onChange(answer.includes(n) ? answer.filter((x) => x !== n) : [...answer, n]);

  return (
    <>
      <p className="note">Клацніть по рядку, щоб позначити його. Повторне клацання знімає позначку</p>
      <div className="editor">
        <div className="editor-bar">
          <span>{lines.length} {plural(lines.length, 'рядок', 'рядки', 'рядків')}</span>
          <span className={`marked${answer.length ? ' has' : ''}`}>Позначено: {answer.length}</span>
        </div>
        <div className="code" role="group" aria-label="Код">
          {lines.map((line, idx) => {
            const n = idx + 1;
            const selected = answer.includes(n);
            return (
              <button
                type="button"
                key={n}
                className={`code-line${selected ? ' selected' : ''}`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggle(n)}
              >
                <span className="ln">{n}</span>
                <span className="src">{line || ' '}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export const findInCode: TaskTypeDef<FindInCodeTask, number[]> = {
  label: 'Знайди в коді',
  initialAnswer: () => [],
  isAnswered: (a) => a.length > 0,
  check: (task, a) => sameSet(task.correctLines, a),
  feedback: (task, a) => {
    const found = a.filter((n) => task.correctLines.includes(n)).length;
    const extra = a.length - found;
    return `Знайдено вразливих рядків: ${found} із ${task.correctLines.length}. Зайвих позначок: ${extra}.`;
  },
  Workspace,
};
