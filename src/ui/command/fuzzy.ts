/**
 * コマンドパレットの曖昧一致 (docs/UI_SPEC.md#コマンドパレット-cmdctrlk)。
 *
 * クエリの文字が対象文字列に同じ順で現れれば一致 (部分列一致) とし、
 * 連続して一致するほど・語の先頭で一致するほど高いスコアを付ける。
 * 日本語は NFKC 正規化とカタカナ → ひらがなの変換をしてから比べるので、
 * 「セイレツ」「せいれつ」「ｾｲﾚﾂ」のどれでも同じ読みに当たる。漢字の読みは
 * 推測しないため、コマンド定義側の `keywords` に読みを書いておく。
 */

/** 比較用に正規化する (NFKC → 小文字 → カタカナをひらがなへ)。 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function isWordBoundary(target: string, index: number): boolean {
  if (index === 0) return true;
  const prev = target[index - 1]!;
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === ':' || prev === '(';
}

/**
 * `query` が `target` に部分列として含まれればスコア (大きいほど良い) を、
 * 含まれなければ null を返す。どちらも正規化済みの文字列を渡すこと。
 */
export function fuzzyScore(query: string, target: string): number | null {
  if (query === '') return 0;
  let score = 0;
  let targetIndex = 0;
  let previousMatch = -2;

  for (const char of query) {
    if (char === ' ') continue;
    const found = target.indexOf(char, targetIndex);
    if (found === -1) return null;
    score += 1;
    if (found === previousMatch + 1) score += 3;
    if (isWordBoundary(target, found)) score += 2;
    previousMatch = found;
    targetIndex = found + 1;
  }

  // 完全一致・前方一致は部分列一致より優先する。短い対象ほど少し有利にする。
  if (target === query) score += 20;
  else if (target.startsWith(query)) score += 10;
  return score - target.length * 0.01;
}

/** 複数の候補文字列 (タイトル・キーワード) のうち最良のスコア。どれにも一致しなければ null。 */
export function bestFuzzyScore(query: string, targets: readonly string[]): number | null {
  const normalizedQuery = normalizeForSearch(query.trim());
  let best: number | null = null;
  for (const target of targets) {
    const score = fuzzyScore(normalizedQuery, normalizeForSearch(target));
    if (score !== null && (best === null || score > best)) best = score;
  }
  return best;
}

export interface Searchable {
  id: string;
  title: string;
  keywords: readonly string[];
}

/** 最近使った操作の順位ごとの加点 (1 番目が最大)。曖昧一致のスコア差を覆しすぎない程度にする。 */
const RECENT_BONUS = 4;

/**
 * パレットの表示順を決める。
 * - クエリが空: 最近使った操作 (新しい順) → 残りを定義順
 * - クエリあり: 一致したものだけを、スコア + 最近使った操作の加点の降順 (同点は定義順)
 */
export function rankItems<T extends Searchable>(items: readonly T[], query: string, recentIds: readonly string[]): T[] {
  const recentRank = new Map(recentIds.map((id, index) => [id, index]));
  const recencyBonus = (id: string): number => {
    const rank = recentRank.get(id);
    return rank === undefined ? 0 : RECENT_BONUS * (1 - rank / recentIds.length);
  };

  if (query.trim() === '') {
    const recent = recentIds.map((id) => items.find((item) => item.id === id)).filter((item): item is T => item !== undefined);
    return [...recent, ...items.filter((item) => !recentRank.has(item.id))];
  }

  return items
    .map((item, index) => ({ item, index, score: bestFuzzyScore(query, [item.title, ...item.keywords]) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .map((entry) => ({ ...entry, score: entry.score + recencyBonus(entry.item.id) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
