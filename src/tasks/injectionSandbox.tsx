import type { InjectionSandboxTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

interface Answer { login: string; password: string }
export type Outcome = 'success' | 'syntax' | 'denied';

const buildQuery = (task: InjectionSandboxTask, a: Answer) =>
  task.queryTemplate.replace('{login}', a.login).replace('{password}', a.password);

/** Чи лишилися незакриті лапки в частині запиту до коментаря */
function hasOpenQuote(q: string): boolean {
  let inQuote = false;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === "'") {
      if (inQuote && q[i + 1] === "'") { i++; continue; }
      inQuote = !inQuote;
    } else if (!inQuote && (q.startsWith('--', i) || c === '#' || q.startsWith('/*', i))) {
      break;
    }
  }
  return inQuote;
}

export function evaluate(task: InjectionSandboxTask, a: Answer): Outcome {
  const q = buildQuery(task, a);
  if (hasOpenQuote(q)) return 'syntax';
  return task.accept.some((p) => new RegExp(p, 'i').test(q)) ? 'success' : 'denied';
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<InjectionSandboxTask, Answer>) {
  const outcome = evaluate(task, answer);
  const [before, rest] = task.queryTemplate.split('{login}');
  const [between, after] = rest.split('{password}');
  const touched = answer.login !== '' || answer.password !== '';

  return (
    <div className="sandbox">
      <div className="login-form">
        <div className="panel-label">Форма входу (сайт жертви)</div>
        <label>
          <span>Логін</span>
          <input className="text-input mono" value={answer.login} disabled={disabled}
            onChange={(e) => onChange({ ...answer, login: e.target.value })}
            autoComplete="off" spellCheck={false} placeholder="admin" />
        </label>
        <label>
          <span>Пароль</span>
          <input className="text-input mono" value={answer.password} disabled={disabled}
            onChange={(e) => onChange({ ...answer, password: e.target.value })}
            autoComplete="off" spellCheck={false} placeholder="невідомий" />
        </label>
      </div>
      <div className="editor">
        <div className="editor-bar"><span>SQL-запит, який збирає сервер</span></div>
        <pre className="query">
          {before}<span className="q-user">{answer.login}</span>{between}<span className="q-user">{answer.password}</span>{after}
        </pre>
      </div>
      <div className={`sandbox-result r-${touched ? outcome : 'idle'}`} role="status">
        {!touched && 'Введіть значення в поля — запит оновлюватиметься на льоту.'}
        {touched && outcome === 'syntax' && 'Помилка синтаксису SQL: не закрито лапки. Запит не виконано.'}
        {touched && outcome === 'denied' && 'Запит виконано. Знайдено рядків: 0 — «Невірний логін або пароль».'}
        {touched && outcome === 'success' && 'Запит повернув рядок користувача admin — вхід виконано без пароля.'}
      </div>
    </div>
  );
}

export const injectionSandbox: TaskTypeDef<InjectionSandboxTask, Answer> = {
  label: 'Пісочниця атаки',
  initialAnswer: () => ({ login: '', password: '' }),
  isAnswered: (a) => a.login !== '' || a.password !== '',
  check: (task, a) => evaluate(task, a) === 'success',
  feedback: (task, a) =>
    evaluate(task, a) === 'syntax'
      ? 'Запит не виконався: у ньому лишилися незакриті лапки.'
      : 'Запит виконався, але адміна він не пропустив. Перегляньте, як змінилась структура запиту.',
  Workspace,
};
