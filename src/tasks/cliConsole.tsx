import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CliConsoleTask } from '../types/content';
import { forbiddenPresent, initialState, missingRequired, promptOf, run, type CliState } from './cliEngine';
import type { TaskTypeDef, WorkspaceProps } from './types';

interface LogEntry {
  prompt: string;
  input: string;
  output: string[];
}

interface Answer {
  state: CliState;
  log: LogEntry[];
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<CliConsoleTask, Answer>) {
  const [input, setInput] = useState('');
  const [histPos, setHistPos] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const history = answer.log.map((l) => l.input).filter(Boolean);

  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [answer.log.length]);

  const submit = () => {
    const prompt = promptOf(task, answer.state);
    const r = run(task, answer.state, input);
    onChange({ state: r.state, log: [...answer.log, { prompt, input, output: r.output }] });
    setInput('');
    setHistPos(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Enter у консолі виконує команду, а не надсилає форму завдання
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      const p = histPos === null ? history.length - 1 : Math.max(0, histPos - 1);
      setHistPos(p);
      setInput(history[p]);
    } else if (e.key === 'ArrowDown' && histPos !== null) {
      e.preventDefault();
      const p = histPos + 1;
      if (p >= history.length) {
        setHistPos(null);
        setInput('');
      } else {
        setHistPos(p);
        setInput(history[p]);
      }
    }
  };

  return (
    <div className="cli">
      <div className="editor">
        <div className="editor-bar">
          <span>Консоль · {task.device}</span>
          {!disabled && answer.log.length > 0 && (
            <button type="button" className="cli-reset" onClick={() => onChange({ state: initialState(task), log: [] })}>
              Скинути пристрій
            </button>
          )}
        </div>
        <div className="cli-screen" ref={screenRef} onClick={() => inputRef.current?.focus()}>
          <div className="cli-line muted-line">Навчальна консоль. «?» – підказка щодо команд, ↑ ↓ – історія.</div>
          {answer.log.map((l, i) => (
            <div key={i}>
              <div className="cli-line"><span className="cli-prompt">{l.prompt}</span>{l.input}</div>
              {l.output.map((o, j) => (
                <div key={j} className={`cli-line${o.startsWith('%') || o.startsWith('Command rejected') ? ' cli-err' : ''}`}>{o || ' '}</div>
              ))}
            </div>
          ))}
          {!disabled && (
            <div className="cli-line cli-input-row">
              <label className="cli-prompt" htmlFor={`cli-${task.id}`}>{promptOf(task, answer.state)}</label>
              <input
                id={`cli-${task.id}`}
                ref={inputRef}
                className="cli-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
              />
            </div>
          )}
        </div>
      </div>
      {!disabled && (
        <div className="cli-mobile">
          <button type="button" className="btn btn-secondary" onClick={submit}>
            Виконати команду
          </button>
        </div>
      )}
    </div>
  );
}

export const cliConsole: TaskTypeDef<CliConsoleTask, Answer> = {
  label: 'Консоль',
  initialAnswer: (task) => ({ state: initialState(task), log: [] }),
  isAnswered: (a) => a.log.length > 0,
  check: (task, a) => missingRequired(task, a.state.config) === 0 && forbiddenPresent(task, a.state.config) === 0,
  feedback: (task, a) => {
    const miss = missingRequired(task, a.state.config);
    const bad = forbiddenPresent(task, a.state.config);
    const parts = [];
    if (miss) parts.push(`бракує потрібних рядків конфігурації: ${miss}`);
    if (bad) parts.push(`є зайві небезпечні рядки: ${bad}`);
    return `Перевірте show running-config: ${parts.join('; ')}.`;
  },
  Workspace,
};
