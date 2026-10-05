import { describe, expect, it } from 'vitest';
import { createFeedbackStore } from '@/state/feedbackStore';

describe('feedbackStore', () => {
  it('pushToast は一意な id を振って積み、dismissToast で取り除く', () => {
    const store = createFeedbackStore();
    const a = store.getState().pushToast({ kind: 'info', message: 'A' });
    const b = store.getState().pushToast({ kind: 'error', message: 'B', details: ['x'] });

    expect(a).not.toBe(b);
    expect(store.getState().toasts).toEqual([
      { id: a, kind: 'info', message: 'A', details: [] },
      { id: b, kind: 'error', message: 'B', details: ['x'] },
    ]);

    store.getState().dismissToast(a);
    expect(store.getState().toasts.map((t) => t.id)).toEqual([b]);
  });

  it('requestConfirm は resolveConfirm の結果で解決し、要求を片付ける', async () => {
    const store = createFeedbackStore();
    const pending = store.getState().requestConfirm({ title: 'T', message: 'M', confirmLabel: 'OK' });
    expect(store.getState().confirmRequest?.title).toBe('T');

    store.getState().resolveConfirm(true);

    await expect(pending).resolves.toBe(true);
    expect(store.getState().confirmRequest).toBeNull();
  });

  it('表示中に別の確認を要求すると、前の要求はキャンセル (false) で解決する', async () => {
    const store = createFeedbackStore();
    const first = store.getState().requestConfirm({ title: '1', message: '', confirmLabel: 'OK' });
    const second = store.getState().requestConfirm({ title: '2', message: '', confirmLabel: 'OK' });

    await expect(first).resolves.toBe(false);
    expect(store.getState().confirmRequest?.title).toBe('2');

    store.getState().resolveConfirm(false);
    await expect(second).resolves.toBe(false);
  });
});
