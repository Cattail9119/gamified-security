import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forbiddenPresent, initialState, missingRequired, parseInterface, promptOf, run, showRun, type CliState } from '../src/tasks/cliEngine.ts';
import type { CliConsoleTask } from '../src/types/content.ts';

const task: CliConsoleTask = {
  id: 't', type: 'cli-console', title: '', xp: 0, prompt: '', explanation: '',
  device: 'SW1',
  interfaces: ['FastEthernet0/1', 'FastEthernet0/5', 'GigabitEthernet0/1'],
  initialConfig: [{ context: 'interface FastEthernet0/5', lines: ['switchport access vlan 20'] }],
  required: [{ context: 'interface FastEthernet0/5', lines: ['switchport port-security maximum *'] }],
  forbidden: [{ context: 'interface FastEthernet0/5', lines: ['shutdown'] }],
};

function exec(cmds: string[], state: CliState = initialState(task)) {
  let s = state;
  const out: string[][] = [];
  for (const c of cmds) {
    const r = run(task, s, c);
    s = r.state;
    out.push(r.output);
  }
  return { state: s, out };
}
const lines = (s: CliState, ctx: string) => s.config.find((b) => b.context === ctx)?.lines ?? [];

test('режими й запрошення', () => {
  let s = initialState(task);
  assert.equal(promptOf(task, s), 'SW1>');
  s = exec(['en'], s).state;
  assert.equal(promptOf(task, s), 'SW1#');
  s = exec(['conf t'], s).state;
  assert.equal(promptOf(task, s), 'SW1(config)#');
  s = exec(['int fa0/5'], s).state;
  assert.equal(promptOf(task, s), 'SW1(config-if)#');
  assert.equal(s.context, 'interface FastEthernet0/5');
  s = exec(['exit'], s).state;
  assert.equal(promptOf(task, s), 'SW1(config)#');
  s = exec(['router ospf 1'], s).state;
  assert.equal(promptOf(task, s), 'SW1(config-router)#');
  s = exec(['end'], s).state;
  assert.equal(promptOf(task, s), 'SW1#');
});

test('скорочення розгортаються в повні команди', () => {
  const { state } = exec(['en', 'conf t', 'int f 0/5', 'sw mo acc', 'sw po', 'sw po max 2', 'sw po mac sti', 'sw po vio res']);
  assert.deepEqual(lines(state, 'interface FastEthernet0/5'), [
    'switchport access vlan 20',
    'switchport mode access',
    'switchport port-security',
    'switchport port-security maximum 2',
    'switchport port-security mac-address sticky',
    'switchport port-security violation restrict',
  ]);
});

test('port-security без access-режиму відхиляється, як в IOS', () => {
  const { state, out } = exec(['en', 'conf t', 'int fa0/5', 'switchport port-security']);
  assert.match(out[3][0], /Command rejected: FastEthernet0\/5 is a dynamic port/);
  assert.ok(!lines(state, 'interface FastEthernet0/5').includes('switchport port-security'));
});

test('неоднозначні, неповні й невідомі команди', () => {
  const { out } = exec(['en', 'conf t', 'int fa0/5', 's', 'switchport port-security violation', 'foo bar', 'sw po ma 2']);
  assert.match(out[3][0], /Ambiguous command/);
  assert.match(out[4][0], /Incomplete command/);
  assert.match(out[5].join('\n'), /Invalid input detected/);
  assert.match(out[6][0], /Ambiguous command/); // ma → maximum | mac-address
});

test('у користувацькому режимі конфігураційні команди недоступні', () => {
  const { out } = exec(['conf t']);
  assert.match(out[0].join('\n'), /Invalid input detected/);
});

test('ключові параметри замінюються, no видаляє', () => {
  const { state } = exec(['en', 'conf t', 'int fa0/5', 'sw mode access', 'sw po max 2', 'sw po max 3', 'shutdown', 'no shut', 'no switchport port-security maximum']);
  const l = lines(state, 'interface FastEthernet0/5');
  assert.ok(!l.some((x) => x.startsWith('switchport port-security maximum')));
  assert.ok(!l.includes('shutdown'));
  const s2 = exec(['sw po max 2', 'sw po max 4'], state).state;
  assert.deepEqual(lines(s2, 'interface FastEthernet0/5').filter((x) => x.includes('maximum')), ['switchport port-security maximum 4']);
});

test('невідомий інтерфейс – помилка; глобальна команда з підрежиму', () => {
  assert.equal(parseInterface('fa0/9', task.interfaces!), null);
  assert.equal(parseInterface('gi0/1', task.interfaces!), 'GigabitEthernet0/1');
  const { state, out } = exec(['en', 'conf t', 'int fa0/9', 'int fa0/5', 'ip dhcp snooping', 'int gi0/1', 'ip dhcp snooping trust']);
  assert.match(out[2].join('\n'), /Invalid input/);
  assert.deepEqual(lines(state, 'global'), ['ip dhcp snooping']);
  assert.deepEqual(lines(state, 'interface GigabitEthernet0/1'), ['ip dhcp snooping trust']);
});

test('do show running-config показує поточний стан', () => {
  const { out } = exec(['en', 'conf t', 'hostname CORE', 'int fa0/5', 'description TEST PORT', 'do sh run']);
  const text = out[5].join('\n');
  assert.match(text, /hostname CORE/);
  assert.match(text, /interface FastEthernet0\/5\n switchport access vlan 20\n description TEST PORT/);
  assert.match(text, /interface FastEthernet0\/1\n!/);
  assert.equal(showRun(task, initialState(task)).at(-1), 'end');
});

test('hostname змінює запрошення', () => {
  const { state } = exec(['en', 'conf t', 'hostname SW-NEW']);
  assert.equal(promptOf(task, state), 'SW-NEW(config)#');
});

test('довідка «?»', () => {
  const { out } = exec(['en', 'conf t', 'int fa0/5', 'switchport port-security ?', 'sw?']);
  assert.ok(out[3].some((l) => l.includes('maximum')));
  assert.ok(out[3].some((l) => l.includes('<cr>')));
  assert.match(out[4][0], /switchport/);
});

test('перевірка required (з *) і forbidden', () => {
  const ok = exec(['en', 'conf t', 'int fa0/5', 'sw mode acc', 'sw po max 7']).state;
  assert.equal(missingRequired(task, ok.config), 0);
  assert.equal(forbiddenPresent(task, ok.config), 0);
  const bad = exec(['shutdown'], ok).state;
  assert.equal(forbiddenPresent(task, bad.config), 1);
  assert.equal(missingRequired(task, initialState(task).config), 1);
});
