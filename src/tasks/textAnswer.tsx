import type { TextAnswerTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<TextAnswerTask, string>) {
  return (
    <input
      className="text-input"
      value={answer}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={task.placeholder ?? 'Ваша відповідь'}
      autoComplete="off"
      spellCheck={false}
      aria-label="Відповідь"
    />
  );
}

export const textAnswer: TaskTypeDef<TextAnswerTask, string> = {
  label: 'Текстова відповідь',
  initialAnswer: () => '',
  isAnswered: (a) => a.trim().length > 0,
  check: (task, a) => task.answers.some((v) => normalize(v) === normalize(a)),
  Workspace,
};
