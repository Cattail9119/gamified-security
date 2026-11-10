export type CourseStatus = 'active' | 'soon';

export interface Course {
  id: string;
  title: string;
  description: string;
  /** Не показується в інтерфейсі */
  icon?: string;
  status: CourseStatus;
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
 *  `[[id|текст]]` — фрагмент, який користувач може позначити;
 *  `[[id|текст|https://справжня-адреса]]` — посилання (адреса видна при наведенні курсора). */
export interface InboxEmail {
  fromName: string;
  fromAddr: string;
  subject: string;
  body: string[];
  phishing: boolean;
  /** id фрагментів, які справді викривають підробку. Інші позначувані фрагменти — відволікаючі */
  clues?: string[];
}

export interface InboxTriageTask extends TaskBase {
  type: 'inbox-triage';
  emails: InboxEmail[];
}

export interface ScenarioChoice {
  text: string;
  /** Бали за рішення (0 — небезпечне, найбільше — правильне) */
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
  /** `code` — рядки коду з нумерацією; `steps` — текст зі списками, що випадають, під кожним рядком */
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
  /** Індекси підмінених файлів, з 0 */
  tampered: number[];
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
  | HashCheckTask;
export type TaskType = Task['type'];
