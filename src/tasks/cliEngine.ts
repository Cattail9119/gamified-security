// Міні-консоль Cisco IOS для навчальних завдань. Не емулятор: лише режими, скорочення команд,
// `no …`, `do …`, `show running-config` і невеликий набір команд для L2-безпеки та OSPF.
// Чистий модуль без React – його перевіряють юніт-тести (tests/).
import type { CliBlock, CliConsoleTask } from '../types/content';

export type CliMode = 'user' | 'priv' | 'config' | 'if' | 'router';

export interface CliState {
  mode: CliMode;
  /** Поточний контекст конфігурації: 'global', 'interface FastEthernet0/5', 'router ospf 1' */
  context: string;
  config: CliBlock[];
}

export interface CliResult {
  state: CliState;
  output: string[];
}

type Act =
  | 'store' | 'enter-if' | 'enter-router'
  | 'enable' | 'disable' | 'conf' | 'exit' | 'end' | 'show-run' | 'write' | 'do';

interface Def {
  /** Слова команди: літерали, альтернативи `a|b`, параметри `<n>`, `<word>`, `<if>`, `<vlans>`, `<rest>` */
  p: string[];
  modes: CliMode[];
  act: Act;
  /** Скільки перших слів визначають параметр: новий рядок з тим самим початком замінює старий */
  key?: number;
  /** Команда port-security працює лише на access-порту */
  needsAccess?: boolean;
}

const CFG: CliMode[] = ['config'];
const IF: CliMode[] = ['if'];
const RT: CliMode[] = ['router'];
const SUB: CliMode[] = ['config', 'if', 'router'];

const DEFS: Def[] = [
  // Привілейований і користувацький режими
  { p: ['enable'], modes: ['user'], act: 'enable' },
  { p: ['disable'], modes: ['priv'], act: 'disable' },
  { p: ['configure', 'terminal'], modes: ['priv'], act: 'conf' },
  { p: ['show', 'running-config'], modes: ['priv'], act: 'show-run' },
  { p: ['write', 'memory'], modes: ['priv'], act: 'write' },
  { p: ['copy', 'running-config', 'startup-config'], modes: ['priv'], act: 'write' },
  { p: ['exit'], modes: ['user', 'priv', ...SUB], act: 'exit' },
  { p: ['end'], modes: SUB, act: 'end' },
  { p: ['do', '<rest>'], modes: SUB, act: 'do' },

  // Глобальна конфігурація
  { p: ['hostname', '<word>'], modes: CFG, act: 'store', key: 1 },
  { p: ['enable', 'secret', '<word>'], modes: CFG, act: 'store', key: 2 },
  { p: ['service', 'password-encryption'], modes: CFG, act: 'store' },
  { p: ['ip', 'dhcp', 'snooping'], modes: CFG, act: 'store' },
  { p: ['ip', 'dhcp', 'snooping', 'vlan', '<vlans>'], modes: CFG, act: 'store' },
  { p: ['interface', '<if>'], modes: CFG, act: 'enter-if' },
  { p: ['router', 'ospf', '<n>'], modes: CFG, act: 'enter-router' },

  // Інтерфейс
  { p: ['description', '<rest>'], modes: IF, act: 'store', key: 1 },
  { p: ['shutdown'], modes: IF, act: 'store' },
  { p: ['switchport', 'mode', 'access|trunk'], modes: IF, act: 'store', key: 2 },
  { p: ['switchport', 'access', 'vlan', '<n>'], modes: IF, act: 'store', key: 3 },
  { p: ['switchport', 'port-security'], modes: IF, act: 'store', needsAccess: true },
  { p: ['switchport', 'port-security', 'maximum', '<n>'], modes: IF, act: 'store', key: 3, needsAccess: true },
  { p: ['switchport', 'port-security', 'mac-address', 'sticky'], modes: IF, act: 'store', needsAccess: true },
  { p: ['switchport', 'port-security', 'violation', 'protect|restrict|shutdown'], modes: IF, act: 'store', key: 3, needsAccess: true },
  { p: ['spanning-tree', 'portfast'], modes: IF, act: 'store' },
  { p: ['spanning-tree', 'bpduguard', 'enable'], modes: IF, act: 'store' },
  { p: ['ip', 'address', '<word>', '<word>'], modes: IF, act: 'store', key: 2 },
  { p: ['ip', 'dhcp', 'snooping', 'trust'], modes: IF, act: 'store' },
  { p: ['ip', 'dhcp', 'snooping', 'limit', 'rate', '<n>'], modes: IF, act: 'store', key: 5 },
  { p: ['ip', 'ospf', 'authentication'], modes: IF, act: 'store', key: 3 },
  { p: ['ip', 'ospf', 'authentication', 'message-digest'], modes: IF, act: 'store', key: 3 },
  { p: ['ip', 'ospf', 'message-digest-key', '<n>', 'md5', '<word>'], modes: IF, act: 'store', key: 4 },

  // OSPF
  { p: ['router-id', '<word>'], modes: RT, act: 'store', key: 1 },
  { p: ['network', '<word>', '<word>', 'area', '<n>'], modes: RT, act: 'store' },
  { p: ['passive-interface', 'default'], modes: RT, act: 'store' },
  { p: ['passive-interface', '<if>'], modes: RT, act: 'store' },
  { p: ['area', '<n>', 'authentication'], modes: RT, act: 'store', key: 3 },
  { p: ['area', '<n>', 'authentication', 'message-digest'], modes: RT, act: 'store', key: 3 },
];

const IF_TYPES = ['FastEthernet', 'GigabitEthernet', 'Loopback', 'Vlan'];

export function interfacesOf(task: CliConsoleTask): string[] {
  return task.interfaces ?? task.initialConfig.filter((b) => b.context.startsWith('interface ')).map((b) => b.context.slice(10));
}

/** `fa0/5`, `f0/5`, `FastEthernet0/5` → `FastEthernet0/5` (якщо такий інтерфейс є на пристрої) */
export function parseInterface(tok: string, interfaces: string[]): string | null {
  const m = tok.match(/^([a-z]+)(\d+(?:\/\d+)*)$/i);
  if (!m) return null;
  const types = IF_TYPES.filter((t) => t.toLowerCase().startsWith(m[1].toLowerCase()));
  if (types.length !== 1) return null;
  const full = types[0] + m[2];
  return interfaces.find((i) => i.toLowerCase() === full.toLowerCase()) ?? null;
}

interface Token { text: string; start: number }

function tokenize(input: string, joinInterfaces = false): Token[] {
  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push({ text: m[0], start: m.index });
  // `int fa 0/5` → один токен `fa0/5`. Лише на другій спробі розбору: інакше `vlan 20` стало б інтерфейсом
  if (joinInterfaces) for (let i = 0; i < out.length - 1; i++) {
    const a = out[i].text;
    const b = out[i + 1].text;
    if (/^[a-z]+$/i.test(a) && /^\d+(\/\d+)*$/.test(b) && IF_TYPES.some((t) => t.toLowerCase().startsWith(a.toLowerCase()))) {
      out.splice(i, 2, { text: a + b, start: out[i].start });
    }
  }
  return out;
}

const isLiteral = (pt: string) => !pt.startsWith('<');

function paramOk(pt: string, tok: string, interfaces: string[]): string | null {
  switch (pt) {
    case '<n>': return /^\d+$/.test(tok) ? tok : null;
    case '<vlans>': return /^\d+([,-]\d+)*$/.test(tok) ? tok : null;
    case '<if>': return parseInterface(tok, interfaces);
    default: return tok; // <word>, <rest>
  }
}

type Parse =
  | { ok: true; def: Def; words: string[]; partial: boolean }
  | { ok: false; kind: 'invalid'; at: number }
  | { ok: false; kind: 'ambiguous' | 'incomplete' };

interface Cand { def: Def; words: string[] }

/** Розбір рядка за граматикою режиму. allowPartial – для `no …`: можна не вказувати параметри */
function parse(tokens: Token[], mode: CliMode, interfaces: string[], allowPartial: boolean): Parse {
  let cands: Cand[] = DEFS.filter((d) => d.modes.includes(mode)).map((def) => ({ def, words: [] }));
  for (let pos = 0; pos < tokens.length; pos++) {
    const tok = tokens[pos].text;
    const low = tok.toLowerCase();
    // <rest> поглинає решту рядка
    const rest = cands.filter((c) => c.def.p[pos] === '<rest>' && c.words.length === pos);
    if (rest.length) {
      const text = tokens.slice(pos).map((t) => t.text).join(' ');
      return { ok: true, def: rest[0].def, words: [...rest[0].words, text], partial: false };
    }
    const keywords = new Set<string>();
    for (const c of cands) {
      const pt = c.def.p[pos];
      if (pt && isLiteral(pt)) pt.split('|').forEach((k) => keywords.add(k));
    }
    const exact = keywords.has(low) ? low : null;
    const prefixed = [...keywords].filter((k) => k.startsWith(low));
    const chosenKw = exact ?? (prefixed.length === 1 ? prefixed[0] : null);

    const next: Cand[] = [];
    for (const c of cands) {
      const pt = c.def.p[pos];
      if (!pt) continue;
      if (isLiteral(pt)) {
        if (chosenKw && pt.split('|').includes(chosenKw)) next.push({ def: c.def, words: [...c.words, chosenKw] });
      } else {
        const v = paramOk(pt, tok, interfaces);
        if (v !== null) next.push({ def: c.def, words: [...c.words, v] });
      }
    }
    if (!next.length) {
      if (!chosenKw && prefixed.length > 1) return { ok: false, kind: 'ambiguous' };
      return { ok: false, kind: 'invalid', at: tokens[pos].start };
    }
    cands = next;
  }
  const full = cands.find((c) => c.def.p.length === tokens.length);
  if (full) return { ok: true, def: full.def, words: full.words, partial: false };
  if (allowPartial && cands.length) return { ok: true, def: cands[0].def, words: cands[0].words, partial: true };
  return { ok: false, kind: 'incomplete' };
}

// ––– конфігурація –––

export const normLine = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

function cloneConfig(cfg: CliBlock[]): CliBlock[] {
  return cfg.map((b) => ({ context: b.context, lines: [...b.lines] }));
}

export function initialState(task: CliConsoleTask): CliState {
  const config = cloneConfig(task.initialConfig);
  if (!config.some((b) => b.context === 'global')) config.unshift({ context: 'global', lines: [] });
  return { mode: 'user', context: 'global', config };
}

function block(cfg: CliBlock[], context: string): CliBlock {
  let b = cfg.find((x) => x.context === context);
  if (!b) {
    b = { context, lines: [] };
    cfg.push(b);
  }
  return b;
}

const startsWithWords = (line: string, prefix: string) => {
  const l = normLine(line);
  const p = normLine(prefix);
  return l === p || l.startsWith(p + ' ');
};

function storeLine(cfg: CliBlock[], context: string, def: Def, line: string) {
  const b = block(cfg, context);
  const keyPrefix = def.key ? line.split(' ').slice(0, def.key).join(' ') : null;
  const idx = b.lines.findIndex((l) => (keyPrefix ? startsWithWords(l, keyPrefix) : normLine(l) === normLine(line)));
  if (idx >= 0) b.lines[idx] = line;
  else b.lines.push(line);
}

function removeLine(cfg: CliBlock[], context: string, def: Def, line: string, partial: boolean) {
  const b = cfg.find((x) => x.context === context);
  if (!b) return;
  const keyPrefix = !partial && def.key ? line.split(' ').slice(0, def.key).join(' ') : null;
  b.lines = b.lines.filter((l) => {
    if (partial) return !startsWithWords(l, line);
    if (keyPrefix) return !startsWithWords(l, keyPrefix);
    return normLine(l) !== normLine(line);
  });
}

export function hostnameOf(task: CliConsoleTask, state: CliState): string {
  const g = state.config.find((b) => b.context === 'global');
  const h = g?.lines.find((l) => startsWithWords(l, 'hostname'));
  return h ? h.trim().split(/\s+/)[1] : task.device;
}

export function promptOf(task: CliConsoleTask, state: CliState): string {
  const host = hostnameOf(task, state);
  switch (state.mode) {
    case 'user': return `${host}>`;
    case 'priv': return `${host}#`;
    case 'config': return `${host}(config)#`;
    case 'if': return `${host}(config-if)#`;
    case 'router': return `${host}(config-router)#`;
  }
}

export function showRun(task: CliConsoleTask, state: CliState): string[] {
  const out = ['Building configuration...', '', 'Current configuration:', '!', `hostname ${hostnameOf(task, state)}`, '!'];
  const global = state.config.find((b) => b.context === 'global');
  const globals = (global?.lines ?? []).filter((l) => !startsWithWords(l, 'hostname'));
  if (globals.length) out.push(...globals, '!');
  const ifs = interfacesOf(task);
  const blocks = [
    ...ifs.map((i) => state.config.find((b) => b.context === `interface ${i}`) ?? { context: `interface ${i}`, lines: [] }),
    ...state.config.filter((b) => b.context.startsWith('router ')),
  ];
  for (const b of blocks) out.push(b.context, ...b.lines.map((l) => ` ${l}`), '!');
  out.push('end');
  return out;
}

// ––– виконання команди –––

function applyAliases(task: CliConsoleTask, input: string): string {
  const trimmed = input.trim();
  for (const [from, to] of Object.entries(task.aliases ?? {})) {
    const f = from.toLowerCase();
    const low = trimmed.toLowerCase();
    if (low === f || low.startsWith(f + ' ')) return to + trimmed.slice(from.length);
  }
  return trimmed;
}

function helpFor(tokens: Token[], mode: CliMode, interfaces: string[]): string[] {
  // Що можна ввести наступним словом
  const defs = DEFS.filter((d) => d.modes.includes(mode));
  const opts = new Set<string>();
  for (const d of defs) {
    if (d.p.length < tokens.length) continue;
    const prefixOk = tokens.every((t, i) => {
      const pt = d.p[i];
      if (isLiteral(pt)) return pt.split('|').some((k) => k.startsWith(t.text.toLowerCase()));
      return paramOk(pt, t.text, interfaces) !== null;
    });
    if (!prefixOk) continue;
    const pt = d.p[tokens.length];
    if (pt === undefined) opts.add('<cr>');
    else if (isLiteral(pt)) pt.split('|').forEach((k) => opts.add(k));
    else opts.add({ '<n>': '<число>', '<vlans>': '<VLAN, напр. 20 або 10,20>', '<if>': '<інтерфейс, напр. fa0/5>', '<word>': '<слово>', '<rest>': '<текст>' }[pt] ?? pt);
  }
  return opts.size ? [...opts].sort().map((o) => `  ${o}`) : ['% Unrecognized command'];
}

export function run(task: CliConsoleTask, state: CliState, rawInput: string): CliResult {
  const input = applyAliases(task, rawInput);
  const next: CliState = { ...state, config: cloneConfig(state.config) };
  if (!input) return { state: next, output: [] };

  const interfaces = interfacesOf(task);
  const promptLen = promptOf(task, state).length;

  // Довідка: `?` або `switchport ?`
  if (input.endsWith('?')) {
    const body = input.slice(0, -1);
    let toks = tokenize(body);
    if (toks[0]?.text.toLowerCase() === 'no' && state.mode !== 'user' && state.mode !== 'priv') toks = toks.slice(1);
    // `sw?` – дописування слова; `sw ?` – наступне слово
    if (body && !/\s$/.test(body)) {
      const last = toks.pop();
      const opts = helpFor(toks, state.mode, interfaces).map((o) => o.trim()).filter((o) => last && o.startsWith(last.text.toLowerCase()));
      return { state: next, output: opts.length ? [opts.join('  ')] : ['% Unrecognized command'] };
    }
    return { state: next, output: helpFor(toks, state.mode, interfaces) };
  }

  const raw = tokenize(input);
  const negate = raw[0]?.text.toLowerCase() === 'no' && SUB.includes(state.mode);
  if (negate && raw.length === 1) return { state: next, output: ['% Incomplete command.'] };

  const attempt = (join: boolean): { res: Parse; toGlobal: boolean } => {
    const tokens = tokenize(input, join).slice(negate ? 1 : 0);
    const r = parse(tokens, state.mode, interfaces, negate);
    // З підрежиму IOS виконує глобальну команду, повертаючись у (config)
    if (!r.ok && r.kind !== 'ambiguous' && (state.mode === 'if' || state.mode === 'router')) {
      const g = parse(tokens, 'config', interfaces, negate);
      if (g.ok && ['store', 'enter-if', 'enter-router'].includes(g.def.act)) return { res: g, toGlobal: true };
    }
    return { res: r, toGlobal: false };
  };
  let { res, toGlobal } = attempt(false);
  if (!res.ok) {
    const joined = attempt(true);
    if (joined.res.ok) ({ res, toGlobal } = joined);
  }
  let mode = state.mode;
  if (toGlobal) {
    mode = 'config';
    next.mode = 'config';
    next.context = 'global';
  }

  if (!res.ok) {
    if (res.kind === 'ambiguous') return { state: next, output: [`% Ambiguous command:  "${input}"`] };
    if (res.kind === 'incomplete') return { state: next, output: ['% Incomplete command.'] };
    // Позиція в рядку: введення в консолі йде одразу після запрошення
    const at = 'at' in res ? res.at : 0;
    return { state: next, output: [' '.repeat(promptLen + at) + '^', "% Invalid input detected at '^' marker."] };
  }

  const { def, words, partial } = res;
  const line = words.join(' ');

  if (negate) {
    if (def.act === 'store') removeLine(next.config, next.context, def, line, partial);
    else if (def.act === 'enter-router') next.config = next.config.filter((b) => b.context !== line);
    else return { state: next, output: ["% Invalid input detected at '^' marker."] };
    return { state: next, output: [] };
  }

  switch (def.act) {
    case 'enable': next.mode = 'priv'; return { state: next, output: [] };
    case 'disable': next.mode = 'user'; return { state: next, output: [] };
    case 'conf':
      next.mode = 'config';
      next.context = 'global';
      return { state: next, output: ['Enter configuration commands, one per line.  End with CNTL/Z.'] };
    case 'exit':
      if (mode === 'if' || mode === 'router') { next.mode = 'config'; next.context = 'global'; }
      else if (mode === 'config') next.mode = 'priv';
      else if (mode === 'priv') next.mode = 'user';
      return { state: next, output: [] };
    case 'end': next.mode = 'priv'; next.context = 'global'; return { state: next, output: [] };
    case 'show-run': return { state: next, output: showRun(task, next) };
    case 'write': return { state: next, output: ['Building configuration...', '[OK]'] };
    case 'do': {
      const r = run(task, { ...next, mode: 'priv' }, words[1]);
      return { state: { ...r.state, mode: next.mode, context: next.context }, output: r.output };
    }
    case 'enter-if':
      next.mode = 'if';
      next.context = `interface ${words[1]}`;
      block(next.config, next.context);
      return { state: next, output: [] };
    case 'enter-router':
      next.mode = 'router';
      next.context = line;
      block(next.config, next.context);
      return { state: next, output: [] };
    case 'store': {
      if (def.needsAccess) {
        const b = next.config.find((x) => x.context === next.context);
        if (!b?.lines.some((l) => normLine(l) === 'switchport mode access')) {
          return { state: next, output: [`Command rejected: ${next.context.replace('interface ', '')} is a dynamic port.`] };
        }
      }
      storeLine(next.config, next.context, def, line);
      return { state: next, output: [] };
    }
  }
}

// ––– перевірка –––

function lineMatches(pattern: string, line: string): boolean {
  const re = new RegExp('^' + normLine(pattern).split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('\\S+') + '$');
  return re.test(normLine(line));
}

const linesOf = (cfg: CliBlock[], context: string) =>
  cfg.find((b) => normLine(b.context) === normLine(context))?.lines ?? [];

/** Скільки обов'язкових рядків бракує */
export function missingRequired(task: CliConsoleTask, cfg: CliBlock[]): number {
  return task.required.reduce(
    (n, b) => n + b.lines.filter((p) => !linesOf(cfg, b.context).some((l) => lineMatches(p, l))).length,
    0,
  );
}

/** Скільки заборонених рядків присутні */
export function forbiddenPresent(task: CliConsoleTask, cfg: CliBlock[]): number {
  return (task.forbidden ?? []).reduce(
    (n, b) => n + b.lines.filter((p) => linesOf(cfg, b.context).some((l) => lineMatches(p, l))).length,
    0,
  );
}
