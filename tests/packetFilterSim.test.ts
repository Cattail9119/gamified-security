import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, failingTests, hostMatches } from '../src/tasks/packetFilterSim.ts';
import type { FilterRule, PacketHost, PacketTest } from '../src/types/content.ts';

const hosts: PacketHost[] = [
  { id: 'hmi', label: 'HMI' },
  { id: 'plc', label: 'ПЛК' },
  { id: 'acc', label: 'Бухгалтер' },
  { id: 'office', label: 'Офіс', members: ['acc', 'printer'] },
  { id: 'all', label: 'Усі', members: ['office', 'hmi'] },
];
const pkt = (src: string, dst: string, proto: string, port?: number): PacketTest => ({ label: '', src, dst, proto, port, expect: 'permit' });
const r = (action: 'permit' | 'deny', proto: string, src: string, dst: string, port: number | 'any' = 'any'): FilterRule => ({ action, proto, src, dst, port });

test('порожній список – неявне deny', () => {
  assert.deepEqual(evaluate([], pkt('hmi', 'plc', 'tcp', 502), hosts), { action: 'deny', rule: null });
});

test('перше правило, що збіглося, вирішує', () => {
  const rules = [r('deny', 'tcp', 'any', 'plc', 502), r('permit', 'tcp', 'hmi', 'plc', 502)];
  assert.deepEqual(evaluate(rules, pkt('hmi', 'plc', 'tcp', 502), hosts), { action: 'deny', rule: 0 });
  assert.deepEqual(evaluate([...rules].reverse(), pkt('hmi', 'plc', 'tcp', 502), hosts), { action: 'permit', rule: 0 });
});

test('any і ip збігаються з будь-чим', () => {
  const rules = [r('permit', 'ip', 'any', 'any')];
  assert.equal(evaluate(rules, pkt('acc', 'plc', 'icmp'), hosts).action, 'permit');
  assert.equal(evaluate(rules, pkt('acc', 'plc', 'udp', 161), hosts).action, 'permit');
  assert.equal(evaluate([r('permit', 'any', 'any', 'any')], pkt('acc', 'plc', 'tcp', 22), hosts).action, 'permit');
});

test('порт і протокол мають збігатися', () => {
  const rules = [r('permit', 'tcp', 'hmi', 'plc', 502)];
  assert.equal(evaluate(rules, pkt('hmi', 'plc', 'tcp', 3389), hosts).action, 'deny');
  assert.equal(evaluate(rules, pkt('hmi', 'plc', 'udp', 502), hosts).action, 'deny');
  assert.equal(evaluate([r('permit', 'tcp', 'hmi', 'plc')], pkt('hmi', 'plc', 'tcp', 3389), hosts).action, 'permit');
});

test('для icmp порт не враховується', () => {
  assert.equal(evaluate([r('permit', 'icmp', 'hmi', 'plc', 502)], pkt('hmi', 'plc', 'icmp'), hosts).action, 'permit');
});

test('мережі й вкладені групи', () => {
  assert.ok(hostMatches('office', 'acc', hosts));
  assert.ok(hostMatches('all', 'acc', hosts));
  assert.ok(!hostMatches('office', 'hmi', hosts));
  assert.equal(evaluate([r('deny', 'ip', 'office', 'plc'), r('permit', 'ip', 'any', 'any')], pkt('acc', 'plc', 'tcp', 502), hosts).action, 'deny');
});

test('цикл у групах не зависає', () => {
  const loop: PacketHost[] = [{ id: 'a', label: '', members: ['b'] }, { id: 'b', label: '', members: ['a'] }];
  assert.ok(!hostMatches('a', 'x', loop));
});

test('failingTests повертає індекси хибних тестів', () => {
  const tests = [{ ...pkt('hmi', 'plc', 'tcp', 502), expect: 'permit' as const }, { ...pkt('acc', 'plc', 'tcp', 502), expect: 'deny' as const }];
  assert.deepEqual(failingTests([], tests, hosts), [0]);
  assert.deepEqual(failingTests([r('permit', 'ip', 'any', 'any')], tests, hosts), [1]);
  assert.deepEqual(failingTests([r('permit', 'tcp', 'hmi', 'plc', 502)], tests, hosts), []);
});
