/**
 * 無選択時のインスペクタ = プロジェクト設定。docs/UI_SPEC.md#無選択-プロジェクト設定。
 */
import { useState } from 'react';
import { matrixReportOf } from '@/state/selectors';
import { useProjectStore } from '@/state/appState';
import type { DiodeDirection } from '@/core/model/types';
import { ActionButton, CheckboxField, DragNumberField, Section, SelectField, TextField } from './fields';

const DIODE_OPTIONS: { value: DiodeDirection; label: string }[] = [
  { value: 'COL2ROW', label: 'COL2ROW' },
  { value: 'ROW2COL', label: 'ROW2COL' },
];

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

function ProjectInspector() {
  const project = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);
  const autoAssignMatrix = useProjectStore((s) => s.autoAssignMatrix);

  const [startRow, setStartRow] = useState(0);
  const [startCol, setStartCol] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const report = matrixReportOf(project);

  return (
    <div className="kl-inspector" data-testid="project-inspector">
      <Section title="プロジェクト">
        <TextField label="名前" value={project.name} onCommit={(name) => updateProjectMeta({ name })} testId="project-name" />
        <div className="kl-field">
          <span className="kl-field-label">作成日時</span>
          <span data-testid="project-created-at">{formatDateTime(project.createdAt)}</span>
        </div>
        <div className="kl-field">
          <span className="kl-field-label">更新日時</span>
          <span data-testid="project-updated-at">{formatDateTime(project.updatedAt)}</span>
        </div>
        <div className="kl-field">
          <span className="kl-field-label">キー数</span>
          <span data-testid="project-key-count">{project.keys.length}</span>
        </div>
      </Section>

      <Section title="キーボード情報">
        <TextField
          label="Keyboard Name"
          value={project.meta.keyboardName}
          onCommit={(keyboardName) => updateProjectMeta({ meta: { keyboardName } })}
          testId="meta-keyboard-name"
        />
        <TextField
          label="Manufacturer"
          value={project.meta.manufacturer}
          onCommit={(manufacturer) => updateProjectMeta({ meta: { manufacturer } })}
        />
        <TextField
          label="Maintainer"
          value={project.meta.maintainer}
          onCommit={(maintainer) => updateProjectMeta({ meta: { maintainer } })}
        />
        <TextField label="URL" value={project.meta.url} onCommit={(url) => updateProjectMeta({ meta: { url } })} />
      </Section>

      <Section title="USB">
        <TextField label="VID" value={project.meta.usb.vid} onCommit={(vid) => updateProjectMeta({ meta: { usb: { vid } } })} />
        <TextField label="PID" value={project.meta.usb.pid} onCommit={(pid) => updateProjectMeta({ meta: { usb: { pid } } })} />
        <TextField
          label="Device Version"
          value={project.meta.usb.deviceVersion}
          onCommit={(deviceVersion) => updateProjectMeta({ meta: { usb: { deviceVersion } } })}
        />
      </Section>

      <Section title="マトリクス">
        <SelectField
          label="ダイオード方向"
          value={project.meta.diodeDirection}
          options={DIODE_OPTIONS}
          onChange={(diodeDirection) => updateProjectMeta({ meta: { diodeDirection } })}
          testId="meta-diode-direction"
        />
        <CheckboxField
          label="分割キーボード"
          checked={project.meta.split}
          onChange={(split) => updateProjectMeta({ meta: { split } })}
          testId="meta-split"
        />
      </Section>

      <Section title="ツール">
        <DragNumberField label="開始 Row" value={startRow} onChange={(v) => setStartRow(Math.round(v))} />
        <DragNumberField label="開始 Col" value={startCol} onChange={(v) => setStartCol(Math.round(v))} />
        <ActionButton
          label="マトリクス自動割り当て (全キー対象)"
          testId="auto-assign-all"
          onClick={() => autoAssignMatrix(null, { startRow, startCol })}
        />
        <ActionButton label="マトリクス検証" testId="validate-matrix" onClick={() => setShowReport(true)} />
        {showReport && (
          <div data-testid="matrix-report">
            {report.issues.length === 0 ? (
              <p className="kl-inspector-empty">問題は見つかりませんでした。</p>
            ) : (
              <ul className="kl-inspector-issue-list">
                {report.issues.map((issue, i) => (
                  <li key={i} className="kl-inspector-issue">
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

export default ProjectInspector;
