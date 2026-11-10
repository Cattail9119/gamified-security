import { useState } from 'react';
import { sameSet, type TaskTypeDef, type WorkspaceProps } from './types';
import { sha256Hex } from './sha256';
import type { HashCheckTask } from '../types/content';

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<HashCheckTask, number[]>) {
  const [computed, setComputed] = useState<Record<number, string>>({});
  const mark = (i: number) => onChange(answer.includes(i) ? answer.filter((x) => x !== i) : [...answer, i]);
  const calcAll = () =>
    setComputed(Object.fromEntries(task.files.map((f, i) => [i, sha256Hex(f.content.join('\n'))])));

  return (
    <div className="hashcheck">
      <div className="actions" style={{ marginTop: 0, marginBottom: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={calcAll} disabled={disabled}>
          Порахувати SHA-256 усіх файлів
        </button>
      </div>
      {task.files.map((f, i) => {
        const h = computed[i];
        const marked = answer.includes(i);
        return (
          <article key={i} className={`hash-file${marked ? ' marked' : ''}`}>
            <header className="hash-file-head">
              <span className="mono hash-name">{f.name}</span>
              <button type="button" className="link-button" disabled={disabled}
                onClick={() => setComputed((c) => ({ ...c, [i]: sha256Hex(f.content.join('\n')) }))}>
                Порахувати хеш
              </button>
            </header>
            <pre className="hash-content">{f.content.join('\n')}</pre>
            <dl className="hash-rows">
              <dt>Від Віталія</dt>
              <dd className="mono hash-val">{f.sha256}</dd>
              <dt>Обчислено</dt>
              <dd className="mono hash-val">{h ?? '—'}</dd>
            </dl>
            <label className={`tamper-toggle${marked ? ' on' : ''}`}>
              <input type="checkbox" checked={marked} disabled={disabled} onChange={() => mark(i)} />
              <span>Файл підмінено</span>
            </label>
          </article>
        );
      })}
    </div>
  );
}

export const hashCheck: TaskTypeDef<HashCheckTask, number[]> = {
  label: 'Перевірка цілісності',
  initialAnswer: () => [],
  isAnswered: () => true,
  check: (task, a) => sameSet(task.tampered, a),
  feedback: () => 'Порівняйте хеші уважно: навіть один зміщений символ повністю змінює результат.',
  Workspace,
};
