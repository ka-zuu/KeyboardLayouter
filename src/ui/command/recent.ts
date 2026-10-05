/**
 * コマンドパレットの「最近使った操作」(docs/UI_SPEC.md#コマンドパレット-cmdctrlk)。
 *
 * 表示順の補助情報にすぎないので、プロジェクトの保存先 (IndexedDB) には載せず
 * `localStorage` にベストエフォートで残す。使えない環境 (プライベートモード等) では
 * そのセッションの間だけメモリに持つ。
 */

const STORAGE_KEY = 'keyboard-layouter:recent-commands';
const MAX_RECENT = 5;

let memory: string[] | null = null;

function load(): string[] {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    memory = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    memory = [];
  }
  return memory;
}

/** 新しい順のコマンド id。 */
export function recentCommandIds(): readonly string[] {
  return load();
}

export function rememberCommand(id: string): void {
  memory = [id, ...load().filter((existing) => existing !== id)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // 保存できなくてもメモリ上の履歴は使える。
  }
}
