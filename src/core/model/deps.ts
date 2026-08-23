/**
 * ID 生成と現在時刻の注入点。
 *
 * core はテストのゴールデンファイルを安定させるため、UUID と現在時刻を
 * 直接呼び出さず、この形の依存を引数の末尾で受け取る。
 * 既定値は crypto.randomUUID / Date.now (どちらも Node にも存在するため
 * core からブラウザ API に依存することにはならない)。
 */
export interface ModelDeps {
  newId(): string;
  now(): number;
}

export const defaultDeps: ModelDeps = {
  newId: () => crypto.randomUUID(),
  now: () => Date.now(),
};
