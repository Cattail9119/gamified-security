import { InlineText } from '../components/RichText';
import type { MultiChoiceTask } from '../types/content';
import { sameSet, type TaskTypeDef, type WorkspaceProps } from './types';

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<MultiChoiceTask, number[]>) {
  const single = task.correct.length === 1;
  const toggle = (i: number) => {
    if (single) onChange([i]);
    else onChange(answer.includes(i) ? answer.filter((x) => x !== i) : [...answer, i]);
  };

  return (
    <div className="options">
      {!single && <p className="note">Можна обрати кілька варіантів.</p>}
      {task.options.map((opt, i) => (
        <label key={i} className={`option${answer.includes(i) ? ' selected' : ''}${disabled ? ' disabled' : ''}`}>
          <input
            type={single ? 'radio' : 'checkbox'}
            name={`mc-${task.id}`}
            checked={answer.includes(i)}
            onChange={() => toggle(i)}
            disabled={disabled}
          />
          <span>
            <InlineText text={opt} />
          </span>
        </label>
      ))}
    </div>
  );
}

export const multiChoice: TaskTypeDef<MultiChoiceTask, number[]> = {
  label: 'Тест',
  initialAnswer: () => [],
  isAnswered: (a) => a.length > 0,
  check: (task, a) => sameSet(task.correct, a),
  Workspace,
};
