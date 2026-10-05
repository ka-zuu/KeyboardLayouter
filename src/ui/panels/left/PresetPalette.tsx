import { useState } from 'react';
import { KEY_PRESETS, MAX_PRESET_COUNT } from '@/core/model/presets';
import { addPresetKeys } from '@/state/actions';
import { PRESET_DRAG_MIME, type PresetDragPayload } from './presetDrag';

/** docs/UI_SPEC.md#キー追加-プリセット。クリックでキャンバス中央、D&D で任意の位置に追加。 */
function PresetPalette() {
  const [count, setCount] = useState(1);

  return (
    <section className="kl-left-section" aria-labelledby="kl-preset-title">
      <h2 id="kl-preset-title" className="kl-left-section-title">
        キー追加
      </h2>
      <div className="kl-preset-grid">
        {KEY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="kl-preset-button"
            data-testid={`preset-${preset.id}`}
            draggable
            title={`${preset.label} を追加 (ドラッグでキャンバスの任意の位置へ)`}
            onClick={() => addPresetKeys(preset, count)}
            onDragStart={(e) => {
              const payload: PresetDragPayload = { id: preset.id, count };
              e.dataTransfer.setData(PRESET_DRAG_MIME, JSON.stringify(payload));
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="kl-field">
        <span className="kl-field-label">個数</span>
        <input
          type="number"
          className="kl-field-input"
          data-testid="preset-count"
          min={1}
          max={MAX_PRESET_COUNT}
          step={1}
          value={count}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value));
            setCount(Number.isFinite(n) ? Math.min(MAX_PRESET_COUNT, Math.max(1, n)) : 1);
          }}
        />
      </label>
    </section>
  );
}

export default PresetPalette;
