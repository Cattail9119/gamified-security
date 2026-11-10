import RichText from '../components/RichText';
import type { PickEmailTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

// «Банк <security@bank.ua>» → ім'я та адреса окремо, щоб адресу було видно моноширинним
function parseFrom(from: string) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!m) return { name: from, addr: '' };
  return { name: m[1] || m[2], addr: m[2] };
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<PickEmailTask, number | null>) {
  return (
    <div className="emails" role="radiogroup" aria-label="Листи">
      {task.emails.map((mail, i) => {
        const selected = answer === i;
        const select = () => !disabled && onChange(i);
        const { name, addr } = parseFrom(mail.from);
        return (
          <div
            key={i}
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            className={`email-card${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
            onClick={select}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select();
              }
            }}
          >
            <span className="avatar" aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>
            <div className="email-head">
              <div className="email-from">
                <span className="email-name">{name}</span>
                {addr && <span className="email-addr">{addr}</span>}
              </div>
              <span className="email-num">Лист {i + 1}</span>
            </div>
            <div className="email-subject">{mail.subject}</div>
            <div className="email-body">
              <RichText text={mail.body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const pickEmail: TaskTypeDef<PickEmailTask, number | null> = {
  label: 'Вибір листа',
  initialAnswer: () => null,
  isAnswered: (a) => a !== null,
  check: (task, a) => a === task.correct,
  Workspace,
};
