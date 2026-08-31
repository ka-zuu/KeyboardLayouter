import { describe, expect, it } from 'vitest';
import { updateProjectMeta } from '@/core/commands/updateProjectMeta';
import { createProject } from '@/core/model/project';

let seq = 0;
let now = 1700000000000;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => now };

describe('updateProjectMeta', () => {
  it('name を更新できる', () => {
    const project = createProject('Before', deps);
    now += 1000;
    const next = updateProjectMeta(project, { name: 'After' }, deps);
    expect(next.name).toBe('After');
    expect(next.updatedAt).toBeGreaterThan(project.updatedAt);
  });

  it('meta を部分的にマージする (他のフィールドは保持)', () => {
    const project = createProject('Test', deps);
    const next = updateProjectMeta(project, { meta: { manufacturer: 'Acme' } }, deps);
    expect(next.meta.manufacturer).toBe('Acme');
    expect(next.meta.keyboardName).toBe(project.meta.keyboardName);
    expect(next.meta.diodeDirection).toBe(project.meta.diodeDirection);
  });

  it('meta.usb もネストしてマージする', () => {
    const project = createProject('Test', deps);
    const next = updateProjectMeta(project, { meta: { usb: { vid: '0x1234' } } }, deps);
    expect(next.meta.usb.vid).toBe('0x1234');
    expect(next.meta.usb.pid).toBe(project.meta.usb.pid);
    expect(next.meta.usb.deviceVersion).toBe(project.meta.usb.deviceVersion);
  });

  it('変化が無ければ同じ参照を返す (履歴を積ませないため)', () => {
    const project = createProject('Test', deps);
    const next = updateProjectMeta(project, {}, deps);
    expect(next).toBe(project);
  });

  it('name が同じ値なら変化として扱わない', () => {
    const project = createProject('Same', deps);
    const next = updateProjectMeta(project, { name: 'Same' }, deps);
    expect(next).toBe(project);
  });

  it('入力オブジェクトを変更しない', () => {
    const project = createProject('Test', deps);
    const frozen = Object.freeze({ ...project, meta: Object.freeze({ ...project.meta, usb: Object.freeze({ ...project.meta.usb }) }) });
    expect(() => updateProjectMeta(frozen, { name: 'X', meta: { manufacturer: 'Y', usb: { vid: '0x9999' } } }, deps)).not.toThrow();
  });
});
