/** プリセットの D&D で使う MIME。中身は `PresetDragPayload` の JSON。 */
export const PRESET_DRAG_MIME = 'application/x-keyboard-layouter-preset';

export interface PresetDragPayload {
  id: string;
  count: number;
}
