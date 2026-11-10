import { Fragment } from 'react';
import { InlineText } from '../components/RichText';
import type { FillSlotsTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

type Answer = (number | null)[];
const SLOT = /(\{\{\d+\}\})/;

function Select({ task, n, answer, onChange, disabled }: WorkspaceProps<FillSlotsTask, Answer> & { n: number }) {
  const slot = task.slots[n - 1];
  if (!slot) return null;
  return (
    <select
      className="slot"
      aria-label={`Поле ${n}`}
      value={answer[n - 1] ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value === '' ? null : Number(e.target.value);
        onChange(answer.map((x, i) => (i === n - 1 ? v : x)));
      }}
    >
      <option value="" disabled>— обрати —</option>
      {slot.options.map((o, i) => <option key={i} value={i}>{o}</option>)}
    </select>
  );
}

function Workspace(props: WorkspaceProps<FillSlotsTask, Answer>) {
  const { task } = props;
  return (
    <>
      {task.diagram && (
        <div className="diagram" aria-label="Схема учасників">
          {task.diagram.map((node, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="diagram-arrow" aria-hidden>→</span>}
              <div className={`diagram-node${node.untrusted ? ' untrusted' : ''}`}>
                <strong>{node.label}</strong>
                {node.note && <span>{node.note}</span>}
              </div>
            </Fragment>
          ))}
        </div>
      )}
      {task.mode === 'code' ? (
        <div className="editor">
          <div className="editor-bar">
            <span>{task.template.length} рядків</span>
            <span>Заповніть пропуски</span>
          </div>
          <div className="code">
            {task.template.map((line, i) => (
              <div className="code-line static" key={i}>
                <span className="ln">{i + 1}</span>
                <span className="src">
                  {line.split(SLOT).map((part, j) => {
                    const m = part.match(/^\{\{(\d+)\}\}$/);
                    return m ? <Select key={j} {...props} n={Number(m[1])} /> : <Fragment key={j}>{part}</Fragment>;
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ol className="slot-steps">
          {task.template.map((line, i) => {
            const parts = line.split(SLOT);
            return (
              <li key={i}>
                {parts.map((part, j) => {
                  const m = part.match(/^\{\{(\d+)\}\}$/);
                  return m ? (
                    <Select key={j} {...props} n={Number(m[1])} />
                  ) : part ? (
                    <span key={j}><InlineText text={part} /></span>
                  ) : null;
                })}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

const wrongCount = (task: FillSlotsTask, a: Answer) => task.slots.filter((s, i) => a[i] !== s.correct).length;

export const fillSlots: TaskTypeDef<FillSlotsTask, Answer> = {
  label: 'Конструктор',
  initialAnswer: (task) => task.slots.map(() => null),
  isAnswered: (a) => a.every((x) => x !== null),
  check: (task, a) => wrongCount(task, a) === 0,
  feedback: (task, a) => `Помилок у полях: ${wrongCount(task, a)} із ${task.slots.length}.`,
  Workspace,
};
