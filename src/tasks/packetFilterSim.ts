// Симуляція ACL / міжмережевого екрана: перше правило, що збіглося, вирішує долю пакета;
// якщо не збіглося жодне – неявне deny в кінці списку.
// Чистий модуль без React – його перевіряють юніт-тести (tests/).
import type { FilterAction, FilterRule, PacketHost, PacketTest } from '../types/content';

export interface Verdict {
  action: FilterAction;
  /** Індекс правила з 0; null – спрацювало неявне deny */
  rule: number | null;
}

const ANY_PROTO = new Set(['ip', 'any']);
const PORTLESS = new Set(['icmp', 'ip', 'any']);

/** Чи входить вузол `id` у вузол/мережу `ref` (з урахуванням вкладених груп) */
export function hostMatches(ref: string, id: string, hosts: PacketHost[], seen: Set<string> = new Set()): boolean {
  if (ref === 'any' || ref === id) return true;
  if (seen.has(ref)) return false;
  seen.add(ref);
  const group = hosts.find((h) => h.id === ref);
  return !!group?.members?.some((m) => hostMatches(m, id, hosts, seen));
}

export function ruleMatches(rule: FilterRule, pkt: PacketTest, hosts: PacketHost[]): boolean {
  if (!ANY_PROTO.has(rule.proto) && rule.proto !== pkt.proto) return false;
  if (!hostMatches(rule.src, pkt.src, hosts)) return false;
  if (!hostMatches(rule.dst, pkt.dst, hosts)) return false;
  if (rule.port !== 'any' && !PORTLESS.has(rule.proto) && rule.port !== pkt.port) return false;
  return true;
}

export function evaluate(rules: FilterRule[], pkt: PacketTest, hosts: PacketHost[]): Verdict {
  const i = rules.findIndex((r) => ruleMatches(r, pkt, hosts));
  return i < 0 ? { action: 'deny', rule: null } : { action: rules[i].action, rule: i };
}

/** Індекси тестів, які обробляються не так, як очікується */
export function failingTests(rules: FilterRule[], tests: PacketTest[], hosts: PacketHost[]): number[] {
  return tests.flatMap((t, i) => (evaluate(rules, t, hosts).action === t.expect ? [] : [i]));
}

/** Чи має порт сенс для протоколу */
export const protoHasPort = (proto: string) => !PORTLESS.has(proto);
