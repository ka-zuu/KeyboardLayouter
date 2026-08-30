/**
 * インスペクタ共通の入力コンポーネント。docs/UI_SPEC.md#単一選択-キープロパティ の
 * 「数値入力はドラッグでの増減に対応 (ラベル部分を左右ドラッグ)」を `DragNumberField`
 * で実装する。複数選択の一括編集では値が揃っていないとき `value=null` で「—」を表示する
 * (docs/UI_SPEC.md#複数選択)。
 */
import { useRef, type ReactNode } from 'react';
import { round4 } from '@/core/geometry/snap';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="kl-inspector-section">
      <h3 className="kl-inspector-section-title">{title}</h3>
      {children}
    </section>
  );
}

interface DragNumberFieldProps {
  label: string;
  /** `null` は複数選択で値が揃っていないことを示す (「—」を表示)。 */
  value: number | null;
  /** `coalesceKey` はドラッグ中の連続変更に付き、確定 (blur/Enter) 時は `null`。 */
  onChange: (value: number, coalesceKey: string | null) => void;
  suffix?: string;
  min?: number;
  /** ラベルを 1px ドラッグしたときの変化量 (U 等)。既定 0.01。 */
  dragSensitivity?: number;
  testId?: string;
  disabled?: boolean;
}

function newDragId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `drag-${Date.now().toString()}`;
}

/** 表示用の文字列。`value` が変わるたびにこれが変わり、下の `<input key>` に使う。 */
function displayText(value: number | null): string {
  return value === null ? '' : String(round4(value));
}

export function DragNumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  dragSensitivity = 0.01,
  testId,
  disabled,
}: DragNumberFieldProps) {
  // 非制御入力にする: 外部 (ストア) から来た value が変わったときだけ
  // `key` 経由で input を再マウントして表示をリセットし、それ以外 (タイピング中)
  // は React の再レンダーを介さずブラウザに任せる。ref を描画中に読み書きする
  // 従来の「props → state 同期」パターンは react-hooks/refs で禁止されているため。
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef<{ startX: number; startValue: number; coalesceKey: string; moved: boolean } | null>(null);

  function clamp(n: number): number {
    return min !== undefined ? Math.max(min, n) : n;
  }

  function commitText(): void {
    const el = inputRef.current;
    if (!el) return;
    const raw = el.value;
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) {
      el.value = displayText(value);
      return;
    }
    onChange(clamp(round4(n)), null);
  }

  function onLabelPointerDown(e: React.PointerEvent<HTMLSpanElement>): void {
    if (disabled || value === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = { startX: e.clientX, startValue: value, coalesceKey: newDragId(), moved: false };
  }

  function onLabelPointerMove(e: React.PointerEvent<HTMLSpanElement>): void {
    const drag = dragging.current;
    if (!drag) return;
    const deltaPx = e.clientX - drag.startX;
    if (Math.abs(deltaPx) < 2 && !drag.moved) return;
    drag.moved = true;
    const next = clamp(round4(drag.startValue + deltaPx * dragSensitivity));
    onChange(next, drag.coalesceKey);
  }

  function onLabelPointerUp(e: React.PointerEvent<HTMLSpanElement>): void {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = null;
  }

  return (
    <label className="kl-field">
      <span
        className="kl-field-label kl-field-label--draggable"
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onPointerCancel={onLabelPointerUp}
      >
        {label}
      </span>
      <input
        key={displayText(value)}
        ref={inputRef}
        data-testid={testId}
        className="kl-field-input"
        type="number"
        step="any"
        defaultValue={displayText(value)}
        placeholder={value === null ? '—' : undefined}
        disabled={disabled}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitText();
            e.currentTarget.blur();
          }
        }}
      />
      {suffix && <span className="kl-field-suffix">{suffix}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string | null;
  onCommit: (value: string) => void;
  testId?: string;
  placeholder?: string;
}

export function TextField({ label, value, onCommit, testId, placeholder }: TextFieldProps) {
  // DragNumberField と同じ理由で非制御入力にする。
  const inputRef = useRef<HTMLInputElement>(null);

  function commitText(): void {
    const el = inputRef.current;
    if (!el) return;
    onCommit(el.value);
  }

  return (
    <label className="kl-field">
      <span className="kl-field-label">{label}</span>
      <input
        key={value ?? ''}
        ref={inputRef}
        data-testid={testId}
        className="kl-field-input"
        type="text"
        defaultValue={value ?? ''}
        placeholder={placeholder ?? (value === null ? '—' : undefined)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitText();
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  testId?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, testId }: SelectFieldProps<T>) {
  return (
    <label className="kl-field">
      <span className="kl-field-label">{label}</span>
      <select
        data-testid={testId}
        className="kl-field-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {value === null && <option value="">—</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}

export function CheckboxField({ label, checked, onChange, testId }: CheckboxFieldProps) {
  return (
    <label className="kl-field kl-field--checkbox">
      <input data-testid={testId} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="kl-field-label">{label}</span>
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  /** `null` = 未指定 (テーマ既定)。 */
  value: string | null;
  onChange: (value: string | null) => void;
  testId?: string;
}

export function ColorField({ label, value, onChange, testId }: ColorFieldProps) {
  return (
    <label className="kl-field">
      <span className="kl-field-label">{label}</span>
      <input
        data-testid={testId}
        className="kl-field-color"
        type="color"
        value={value ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="kl-field-color-clear" onClick={() => onChange(null)} disabled={value === null}>
        既定
      </button>
    </label>
  );
}

export function ActionButton({
  label,
  onClick,
  testId,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  testId?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={danger ? 'kl-action-button kl-action-button--danger' : 'kl-action-button'}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
