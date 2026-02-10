import { customStorage } from './storage';
import * as idb from './idb';

jest.mock('./idb', () => ({
  get: jest.fn(),
  set: jest.fn(() => Promise.resolve()),
  del: jest.fn(() => Promise.resolve()),
}));

describe('customStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getItem tries IDB first', async () => {
    (idb.get as jest.Mock).mockResolvedValueOnce({ foo: 'bar' });
    const result = await customStorage.getItem('test');
    expect(idb.get).toHaveBeenCalledWith('test');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('getItem returns null if not found', async () => {
    (idb.get as jest.Mock).mockResolvedValueOnce(undefined);
    const result = await customStorage.getItem('test');
    expect(result).toBeNull();
  });

  it('setItem debounces writes', () => {
    customStorage.setItem('test', { a: 1 });
    customStorage.setItem('test', { a: 2 });

    expect(idb.set).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(idb.set).not.toHaveBeenCalled();

    jest.advanceTimersByTime(600); // Total 1100ms
    expect(idb.set).toHaveBeenCalledTimes(1);
    expect(idb.set).toHaveBeenCalledWith('test', { a: 2 });
  });

  it('removeItem clears pending debounce and deletes from IDB', () => {
    customStorage.setItem('test', { a: 1 });
    customStorage.removeItem('test');

    jest.advanceTimersByTime(1100);
    expect(idb.set).not.toHaveBeenCalled();
    expect(idb.del).toHaveBeenCalledWith('test');
  });
});
