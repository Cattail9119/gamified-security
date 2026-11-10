import { useState, type ReactNode } from 'react';
import { InlineText } from '../components/RichText';
import type { InboxTriageTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

type Verdict = 'safe' | 'phish' | null;
interface Answer {
  verdicts: Verdict[];
  /** id позначених фрагментів */
  flags: string[];
}

const MARK = /\[\[([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/g;

interface Ctx {
  flags: string[];
  disabled: boolean;
  toggle: (id: string) => void;
  showUrl: (url: string | null) => void;
}

function Marked({ text, ctx }: { text: string; ctx: Ctx }) {
  const nodes: ReactNode[] = [];
  const re = new RegExp(MARK.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(<InlineText key={`t${last}`} text={text.slice(last, m.index)} />);
    const [, id, label, url] = m;
    const flagged = ctx.flags.includes(id);
    nodes.push(
      <button
        type="button"
        key={`m${m.index}`}
        className={`clue${url ? ' clue-link' : ''}${flagged ? ' flagged' : ''}`}
        aria-pressed={flagged}
        disabled={ctx.disabled}
        onClick={() => ctx.toggle(id)}
        onMouseEnter={() => url && ctx.showUrl(url)}
        onMouseLeave={() => ctx.showUrl(null)}
        onFocus={() => url && ctx.showUrl(url)}
        onBlur={() => ctx.showUrl(null)}
      >
        {label}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<InlineText key={`t${last}`} text={text.slice(last)} />);
  return <>{nodes}</>;
}

const requiredClues = (task: InboxTriageTask) => task.emails.flatMap((e) => (e.phishing ? e.clues ?? [] : []));
const expectedVerdict = (phishing: boolean): Verdict => (phishing ? 'phish' : 'safe');

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<InboxTriageTask, Answer>) {
  const [url, setUrl] = useState<string | null>(null);
  const ctx: Ctx = {
    flags: answer.flags,
    disabled,
    showUrl: setUrl,
    toggle: (id) =>
      onChange({
        ...answer,
        flags: answer.flags.includes(id) ? answer.flags.filter((x) => x !== id) : [...answer.flags, id],
      }),
  };
  const setVerdict = (i: number, v: Verdict) =>
    onChange({ ...answer, verdicts: answer.verdicts.map((x, j) => (j === i ? v : x)) });

  const decided = answer.verdicts.filter(Boolean).length;

  return (
    <>
      <p className="note">
        Вердикт — для кожного листа. У листах, які вважаєте фішинговими, позначте фрагменти, що викривають підробку.
        Позначка у безпечному листі — помилка.
      </p>
      <div className="emails inbox">
        {task.emails.map((mail, i) => (
          <article key={i} className="email-card inbox-card">
            <span className="avatar" aria-hidden>{mail.fromName.trim().charAt(0).toUpperCase()}</span>
            <div className="email-head">
              <div className="email-from">
                <span className="email-name">{mail.fromName}</span>
                <span className="email-addr">
                  {'<'}<Marked text={mail.fromAddr} ctx={ctx} />{'>'}
                </span>
              </div>
              <span className="email-num">Лист {i + 1}</span>
            </div>
            <div className="email-subject"><Marked text={mail.subject} ctx={ctx} /></div>
            <div className="email-body">
              {mail.body.map((p, j) => (
                <p key={j}><Marked text={p} ctx={ctx} /></p>
              ))}
            </div>
            <div className="verdict" role="group" aria-label={`Вердикт щодо листа ${i + 1}`}>
              {(['safe', 'phish'] as const).map((v) => (
                <button
                  type="button"
                  key={v}
                  className={`verdict-btn verdict-${v}${answer.verdicts[i] === v ? ' on' : ''}`}
                  aria-pressed={answer.verdicts[i] === v}
                  disabled={disabled}
                  onClick={() => setVerdict(i, answer.verdicts[i] === v ? null : v)}
                >
                  {v === 'safe' ? 'Безпечний' : 'Фішинг'}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="statusbar" aria-live="polite">
        <span className="statusbar-label">Адреса за посиланням</span>
        <span className="mono statusbar-url">{url ?? '— наведіть курсор на посилання'}</span>
        <span className="statusbar-count">Вердиктів: {decided} з {task.emails.length} · позначок: {answer.flags.length}</span>
      </div>
    </>
  );
}

function stats(task: InboxTriageTask, a: Answer) {
  const wrongVerdicts = task.emails.filter((e, i) => a.verdicts[i] !== expectedVerdict(e.phishing)).length;
  const need = requiredClues(task);
  const missed = need.filter((id) => !a.flags.includes(id)).length;
  const extra = a.flags.filter((id) => !need.includes(id)).length;
  return { wrongVerdicts, missed, extra };
}

export const inboxTriage: TaskTypeDef<InboxTriageTask, Answer> = {
  label: 'Розбір пошти',
  initialAnswer: (task) => ({ verdicts: task.emails.map(() => null), flags: [] }),
  isAnswered: (a) => a.verdicts.every(Boolean),
  check: (task, a) => {
    const s = stats(task, a);
    return s.wrongVerdicts === 0 && s.missed === 0 && s.extra === 0;
  },
  feedback: (task, a) => {
    const s = stats(task, a);
    const parts: string[] = [];
    if (s.wrongVerdicts) parts.push(`хибних вердиктів: ${s.wrongVerdicts}`);
    if (s.missed) parts.push(`пропущено ознак: ${s.missed}`);
    if (s.extra) parts.push(`зайвих позначок: ${s.extra}`);
    return parts.length ? parts.join(', ')[0].toUpperCase() + parts.join(', ').slice(1) + '.' : undefined;
  },
  Workspace,
};
