// Перевірка контенту: структура всіх завдань і розв'язуваність нових механік курсу critical-infra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { failingTests } from '../src/tasks/packetFilterSim.ts';
import { forbiddenPresent, initialState, missingRequired, run } from '../src/tasks/cliEngine.ts';
import { passed, play } from '../src/tasks/incidentLogic.ts';
import type { CliConsoleTask, Course, FilterRule, IncidentSimTask, PacketFilterTask, Task } from '../src/types/content.ts';

const root = new URL('../content/', import.meta.url);
const courses: Course[] = JSON.parse(readFileSync(new URL('courses.json', root), 'utf8'));
const byCourse: Record<string, Task[]> = Object.fromEntries(
  readdirSync(new URL('tasks/', root)).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(`tasks/${f}`, root), 'utf8'))]),
);
const ci = byCourse['critical-infra'];
const get = <T extends Task>(id: string) => {
  const t = ci.find((x) => x.id === id);
  assert.ok(t, `немає завдання ${id}`);
  return t as T;
};
const inRange = (xs: number[], n: number) => xs.every((x) => Number.isInteger(x) && x >= 0 && x < n);

test('курс зареєстровано, ранги впорядковані', () => {
  const c = courses.find((x) => x.id === 'critical-infra');
  assert.ok(c);
  assert.equal(c.status, 'active');
  const xs = c.ranks!.map((r) => r.xp);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b));
  assert.equal(xs[0], 0);
  assert.ok(ci.length >= 38);
});

for (const [courseId, tasks] of Object.entries(byCourse)) {
  test(`структура завдань: ${courseId}`, () => {
    const ids = new Set<string>();
    for (const t of tasks) {
      const where = `${courseId}/${t.id}`;
      assert.ok(!ids.has(t.id), `${where}: дубль id`);
      ids.add(t.id);
      assert.ok(t.title && t.prompt && t.explanation && t.xp > 0, `${where}: базові поля`);
      switch (t.type) {
        case 'multi-choice': assert.ok(t.correct.length && inRange(t.correct, t.options.length), where); break;
        case 'find-in-code': {
          const n = Array.isArray(t.code) ? t.code.length : t.code.split('\n').length;
          assert.ok(t.correctLines.every((l) => l >= 1 && l <= n), where);
          break;
        }
        case 'fill-slots': {
          const used = new Set(t.template.flatMap((l) => [...l.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))));
          assert.equal(used.size, t.slots.length, `${where}: кількість пропусків`);
          t.slots.forEach((s) => assert.ok(inRange([s.correct], s.options.length), where));
          break;
        }
        case 'ordering': assert.ok(t.items.length >= 3 && new Set(t.items).size === t.items.length, where); break;
        case 'matching':
          assert.equal(t.pairs.length, t.left.length, where);
          assert.ok(inRange(t.pairs, t.right.length), where);
          assert.equal(new Set(t.pairs).size, t.pairs.length, `${where}: пари мають бути 1:1`);
          break;
        case 'sort-bins': {
          const bins = new Set(t.bins.map((b) => b.id));
          assert.ok(t.items.every((i) => bins.has(i.bin)), where);
          break;
        }
        case 'packet-filter': {
          const hosts = new Set(['any', ...t.hosts.map((h) => h.id)]);
          for (const p of t.tests) assert.ok(hosts.has(p.src) && hosts.has(p.dst) && t.protocols.includes(p.proto), `${where}: ${p.label}`);
          for (const r of t.initialRules ?? []) assert.ok(hosts.has(r.src) && hosts.has(r.dst), where);
          break;
        }
        case 'incident-sim': {
          const steps = new Set(t.steps.map((s) => s.id));
          assert.ok(steps.has(t.startStep), where);
          for (const s of t.steps) for (const c of s.choices) {
            assert.ok(c.next === undefined || steps.has(c.next), `${where}: ${s.id} → ${c.next}`);
            assert.ok(Object.keys(c.effects).every((k) => t.meters.some((m) => m.id === k)), where);
          }
          break;
        }
        case 'hash-check': assert.ok(inRange(t.tampered, t.files.length), where); break;
        case 'scenario': assert.ok(t.passScore <= t.steps.reduce((s, x) => s + Math.max(...x.choices.map((c) => c.points)), 0), where); break;
        default: break;
      }
    }
  });
}

test('hash-check: підмінені саме ті файли, що позначені', () => {
  for (const t of Object.values(byCourse).flat()) {
    if (t.type !== 'hash-check') continue;
    const bad = t.files.flatMap((f, i) => (createHash('sha256').update(f.content.join('\n')).digest('hex') === f.sha256 ? [] : [i]));
    assert.deepEqual(bad, [...t.tampered].sort(), t.id);
  }
});

// ——— еталонні рішення ———

const R = (action: 'permit' | 'deny', proto: string, src: string, dst: string, port: number | 'any' = 'any'): FilterRule => ({ action, proto, src, dst, port });

test('packet-filter «Лише інженер говорить з ПЛК»', () => {
  const t = get<PacketFilterTask>('m5-build-acl');
  assert.ok(failingTests([], t.tests, t.hosts).length > 0);
  const ok = [R('permit', 'tcp', 'hmi', 'plc', 502), R('permit', 'tcp', 'ews', 'plc', 502), R('permit', 'icmp', 'hmi', 'plc')];
  assert.deepEqual(failingTests(ok, t.tests, t.hosts), []);
  // типова помилка: permit ip з HMI дозволяє RDP
  const lazy = [R('permit', 'ip', 'hmi', 'plc'), R('permit', 'tcp', 'ews', 'plc', 502)];
  assert.ok(failingTests(lazy, t.tests, t.hosts).length > 0);
  assert.ok(ok.length <= (t.maxRules ?? 8));
});

test('packet-filter «Тарасів ACL»: початковий список хибний, виправлений – ні', () => {
  const t = get<PacketFilterTask>('m5-audit-acl');
  assert.equal(failingTests(t.initialRules!, t.tests, t.hosts).length, 3);
  const fixed = [R('permit', 'tcp', 'hmi', 'plc', 502), R('permit', 'tcp', 'ews', 'plc', 502), R('deny', 'tcp', 'any', 'plc', 502), R('permit', 'tcp', 'office', 'mirror', 443)];
  assert.deepEqual(failingTests(fixed, t.tests, t.hosts), []);
  // лише видалити permit ip any any – мало: зламається доступ до дзеркала
  const onlyDelete = t.initialRules!.filter((r) => r.proto !== 'ip');
  assert.ok(failingTests(onlyDelete, t.tests, t.hosts).length > 0);
});

test('packet-filter «Порт 502 в інтернеті»', () => {
  const t = get<PacketFilterTask>('m10-port-502');
  const ok = [R('permit', 'tcp', 'hmi', 'plcs', 502), R('permit', 'tcp', 'contractor', 'jump', 443)];
  assert.deepEqual(failingTests(ok, t.tests, t.hosts), []);
  const alsoOk = [R('permit', 'tcp', 'hmi', 'plcs', 502), R('permit', 'tcp', 'internet', 'jump', 443)];
  assert.deepEqual(failingTests(alsoOk, t.tests, t.hosts), []);
  const open = [R('permit', 'tcp', 'any', 'plcs', 502), R('permit', 'tcp', 'contractor', 'jump', 443)];
  assert.ok(failingTests(open, t.tests, t.hosts).length > 0);
});

function cli(t: CliConsoleTask, cmds: string[]) {
  let s = initialState(t);
  for (const c of cmds) {
    const r = run(t, s, c);
    assert.ok(!r.output.some((o) => o.startsWith('%') || o.startsWith('Command rejected')), `${t.id}: «${c}» → ${r.output.join(' | ')}`);
    s = r.state;
  }
  return { missing: missingRequired(t, s.config), forbidden: forbiddenPresent(t, s.config) };
}

test('cli «Замкни порт»', () => {
  const t = get<CliConsoleTask>('m4-port-security');
  assert.deepEqual(cli(t, ['enable', 'conf t', 'int fa0/5', 'switchport mode access', 'switchport port-security', 'sw po max 2', 'sw po mac-address sticky', 'sw po violation restrict', 'end']), { missing: 0, forbidden: 0 });
  assert.ok(cli(t, ['enable', 'conf t', 'int fa0/5', 'sw mode access', 'sw po max 2', 'sw po mac sticky', 'sw po vio restrict']).missing > 0, 'без switchport port-security не зараховується');
  assert.ok(cli(t, ['en', 'conf t', 'int fa0/5', 'sw mode access', 'sw po', 'sw po max 2', 'sw po mac sticky', 'sw po vio shutdown']).missing > 0);
});

test('cli «Довірений лише один»', () => {
  const t = get<CliConsoleTask>('m4-dhcp-snooping');
  assert.deepEqual(cli(t, ['en', 'conf t', 'ip dhcp snooping', 'ip dhcp snooping vlan 20', 'int gi0/1', 'ip dhcp snooping trust', 'end']), { missing: 0, forbidden: 0 });
  assert.equal(cli(t, ['en', 'conf t', 'ip dhcp snooping', 'ip dhcp snooping vlan 20', 'int gi0/1', 'ip dhcp snooping trust', 'int fa0/5', 'ip dhcp snooping trust']).forbidden, 1);
});

test('cli «Підпиши анонси»', () => {
  const t = get<CliConsoleTask>('m8-ospf-auth');
  assert.deepEqual(cli(t, ['en', 'conf t', 'int gi0/0', 'ip ospf authentication message-digest', 'ip ospf message-digest-key 1 md5 Teplo-Core-2025', 'exit', 'router ospf 1', 'passive-interface gi0/2', 'end']), { missing: 0, forbidden: 0 });
  assert.equal(cli(t, ['en', 'conf t', 'int gi0/0', 'ip ospf auth message-digest', 'ip ospf message-digest-key 1 md5 k', 'router ospf 1', 'passive-interface gi0/2', 'passive-interface gi0/0']).forbidden, 1);
});

test('incident-sim: найкраща лінія проходить, ключові помилки – ні', () => {
  const t = get<IncidentSimTask>('m11-winter-attack');
  const best = [0, 0, 0, 0, 0];
  assert.ok(play(t, best).ended);
  assert.ok(passed(t, best));
  assert.ok(!passed(t, [1, 0, 0, 0, 0]), 'перезавантаження всіх контролерів');
  assert.ok(!passed(t, [0, 2, 0, 0, 0]), 'спостерігати годину');
  assert.ok(!passed(t, [0, 0, 1, 0, 0]), 'перевстановити без образу');
  assert.ok(!passed(t, [0, 0, 0, 2, 0]), 'не повідомляти');
  assert.ok(!passed(t, [0, 0, 0, 0, 1]), 'автоматика без перевірки');
  assert.ok(passed(t, [2, 0, 0, 0, 0, 0]), 'запізнилися, але виправились');
  assert.ok(!passed(t, [2, 1, 0, 0, 0, 0]));
});
