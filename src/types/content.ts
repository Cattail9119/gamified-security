export type CourseStatus = 'active' | 'soon';

export interface Course {
  id: string;
  title: string;
  description: string;
  /** Не показується в інтерфейсі */
  icon?: string;
  status: CourseStatus;
  /** Ранги за сумою XP курсу (за зростанням `xp`), показуються над списком завдань */
  ranks?: { title: string; xp: number }[];
}

/** Рядок (абзаци через порожній рядок) або масив абзаців. */
export type RichTextValue = string | string[];

interface TaskBase {
  id: string;
  title: string;
  xp: number;
  theory?: RichTextValue;
  prompt: RichTextValue;
  hint?: RichTextValue;
  explanation: RichTextValue;
  /** Модуль курсу: завдання з однаковим `module` групуються на сторінці курсу */
  module?: string;
  /** true – завдання тимчасово не показується (лишається в JSON, щоб легко повернути) */
  hidden?: boolean;
}

export interface MultiChoiceTask extends TaskBase {
  type: 'multi-choice';
  options: string[];
  /** Індекси з 0 */
  correct: number[];
}

export interface FindInCodeTask extends TaskBase {
  type: 'find-in-code';
  code: string | string[];
  /** Номери рядків з 1 */
  correctLines: number[];
  /** Що саме аналізуємо: змінює лише підписи над блоком (за замовчуванням – код) */
  variant?: 'code' | 'log' | 'config';
}

export interface TextAnswerTask extends TaskBase {
  type: 'text-answer';
  answers: string[];
  placeholder?: string;
}

export interface Email {
  from: string;
  subject: string;
  body: RichTextValue;
}

export interface PickEmailTask extends TaskBase {
  type: 'pick-email';
  emails: Email[];
  /** Індекс з 0 */
  correct: number;
}

/** Лист для розбору. У `fromAddr`, `subject` і `body` можна позначати фрагменти:
 *  `[[id|текст]]` – фрагмент, який користувач може позначити;
 *  `[[id|текст|https://справжня-адреса]]` – посилання (адреса видна при наведенні курсора). */
export interface InboxEmail {
  fromName: string;
  fromAddr: string;
  subject: string;
  body: string[];
  phishing: boolean;
  /** id фрагментів, які справді викривають підробку. Інші позначувані фрагменти – відволікаючі */
  clues?: string[];
}

export interface InboxTriageTask extends TaskBase {
  type: 'inbox-triage';
  emails: InboxEmail[];
}

export interface ScenarioChoice {
  text: string;
  /** Бали за рішення (0 – небезпечне, найбільше – правильне) */
  points: number;
  /** Наслідок, який показується одразу після вибору */
  outcome: RichTextValue;
}

export interface ScenarioStep {
  title?: string;
  situation: RichTextValue;
  choices: ScenarioChoice[];
}

export interface ScenarioTask extends TaskBase {
  type: 'scenario';
  steps: ScenarioStep[];
  /** Мінімум балів для зарахування */
  passScore: number;
}

export interface PasswordLabTask extends TaskBase {
  type: 'password-lab';
  /** Рядки «профілю», які видно користувачеві */
  profile: string[];
  /** Підрядки (без урахування регістру), яких у паролі не має бути */
  forbidden: string[];
  /** Поширені слова й шаблони, яких у паролі не має бути */
  common: string[];
  minLength: number;
  minYears: number;
}

export interface InjectionSandboxTask extends TaskBase {
  type: 'injection-sandbox';
  /** Шаблон запиту з підстановками `{login}` і `{password}` */
  queryTemplate: string;
  /** Регулярні вирази (JSON-рядки), які перевіряються на готовому запиті; збіг = атака вдалася */
  accept: string[];
}

export interface Slot {
  options: string[];
  /** Індекс з 0 */
  correct: number;
}

export interface FillSlotsTask extends TaskBase {
  type: 'fill-slots';
  /** `code` – рядки коду з нумерацією; `steps` – текст зі списками, що випадають, під кожним рядком */
  mode: 'code' | 'steps';
  /** Рядки з місцями для вибору `{{1}}`, `{{2}}`… (нумерація збігається з порядком у `slots`) */
  template: string[];
  slots: Slot[];
  /** Схема учасників над завданням */
  diagram?: { label: string; note?: string; untrusted?: boolean }[];
}

export interface CipherLabTask extends TaskBase {
  type: 'cipher-lab';
  ciphertext: string;
  /** Очікуваний відкритий текст (латиниця) */
  plaintext: string;
}

export interface HashFile {
  name: string;
  /** Рядки вмісту (так, як їх отримав Олексій) */
  content: string[];
  /** SHA-256 оригіналу, яку Віталій передав окремим каналом */
  sha256: string;
}

export interface HashCheckTask extends TaskBase {
  type: 'hash-check';
  files: HashFile[];
  /** Підпис рядка з еталонним хешем (за замовчуванням «Від Віталія») */
  referenceLabel?: string;
  /** Індекси підмінених файлів, з 0 */
  tampered: number[];
}

export interface OrderingTask extends TaskBase {
  type: 'ordering';
  /** Елементи в ПРАВИЛЬНОМУ порядку; на екрані перемішуються */
  items: string[];
}

export interface MatchingTask extends TaskBase {
  type: 'matching';
  left: string[];
  /** Може містити зайві варіанти-відволікачі */
  right: string[];
  /** pairs[i] – індекс у right для left[i] */
  pairs: number[];
  /** Заголовки колонок */
  leftLabel?: string;
  rightLabel?: string;
}

export interface SortBin {
  id: string;
  label: string;
  note?: string;
}

export interface SortBinsTask extends TaskBase {
  type: 'sort-bins';
  bins: SortBin[];
  items: { text: string; bin: string }[];
  /** 'stack' – кошики як поверхи (зверху вниз, як у JSON), 'columns' – колонки */
  layout?: 'stack' | 'columns';
}

export type FilterAction = 'permit' | 'deny';
export type FilterPort = number | 'any';

export interface FilterRule {
  action: FilterAction;
  /** 'ip' або 'any' – будь-який протокол */
  proto: string;
  /** id вузла з hosts або 'any' */
  src: string;
  dst: string;
  /** Для icmp та ip порт не враховується */
  port: FilterPort;
}

export interface PacketHost {
  id: string;
  label: string;
  /** Для мереж і груп: id вузлів, що в них входять */
  members?: string[];
}

export interface PacketTest {
  label: string;
  src: string;
  dst: string;
  proto: string;
  port?: number;
  expect: FilterAction;
}

export interface PacketFilterTask extends TaskBase {
  type: 'packet-filter';
  /** Назва пристрою/списку над правилами */
  device?: string;
  hosts: PacketHost[];
  protocols: string[];
  ports: FilterPort[];
  /** 'build' – скласти з нуля; 'audit' – виправити готовий список */
  mode: 'build' | 'audit';
  initialRules?: FilterRule[];
  maxRules?: number;
  tests: PacketTest[];
  /** true – результати тестів видно одразу (навчальний режим) */
  liveTests?: boolean;
}

export interface IncidentMeter {
  id: string;
  label: string;
  /** 0..100 */
  start: number;
  /** Нижче цього значення – провал */
  min: number;
}

export interface IncidentChoice {
  text: string;
  /** Зміни показників: id показника → дельта */
  effects: Record<string, number>;
  outcome: RichTextValue;
  /** id наступного кроку; немає – кінець сценарію */
  next?: string;
}

export interface IncidentStep {
  id: string;
  title?: string;
  situation: RichTextValue;
  choices: IncidentChoice[];
}

export interface IncidentSimTask extends TaskBase {
  type: 'incident-sim';
  meters: IncidentMeter[];
  steps: IncidentStep[];
  startStep: string;
}

export interface CliBlock {
  /** 'global', 'interface FastEthernet0/1', 'router ospf 1' */
  context: string;
  lines: string[];
}

export interface CliConsoleTask extends TaskBase {
  type: 'cli-console';
  /** hostname пристрою */
  device: string;
  initialConfig: CliBlock[];
  /** Що має бути в конфігурації після роботи. `*` у рядку – будь-яке слово */
  required: CliBlock[];
  forbidden?: CliBlock[];
  /** Інтерфейси пристрою (повні назви). За замовчуванням – ті, що є в initialConfig */
  interfaces?: string[];
  /** Додаткові скорочення: «що ввів користувач» → «на що замінити» */
  aliases?: Record<string, string>;
}

export type Task =
  | MultiChoiceTask
  | FindInCodeTask
  | TextAnswerTask
  | PickEmailTask
  | InboxTriageTask
  | ScenarioTask
  | PasswordLabTask
  | InjectionSandboxTask
  | FillSlotsTask
  | CipherLabTask
  | HashCheckTask
  | OrderingTask
  | MatchingTask
  | SortBinsTask
  | PacketFilterTask
  | IncidentSimTask
  | CliConsoleTask;
export type TaskType = Task['type'];
