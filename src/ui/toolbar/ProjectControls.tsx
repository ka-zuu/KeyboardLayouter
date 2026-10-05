import { useCallback, useState } from 'react';
import { useProjectStore } from '@/state/appState';
import { createNewProject, duplicateProjectById, renameCurrentProject, saveAndNotify } from '@/state/projectActions';
import { confirmDeleteProject, PROJECT_LIST_SECTION_ID } from '@/ui/panels/left/projectListShared';
import MenuPopover, { type MenuItem } from './MenuPopover';

function openProjectList(): void {
  const section = document.getElementById(PROJECT_LIST_SECTION_ID);
  section?.scrollIntoView({ block: 'nearest' });
  section?.focus();
}

/**
 * プロジェクト名のインライン編集 (Enter 確定 / Esc 取消) とプロジェクトメニュー (▾)。
 * docs/UI_SPEC.md#ツールバー。
 */
function ProjectControls() {
  const project = useProjectStore((s) => s.project);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const items: MenuItem[] = [
    { id: 'new', label: '新規プロジェクト', onSelect: createNewProject },
    { id: 'save', label: '保存 (Ctrl+S)', onSelect: () => void saveAndNotify() },
    {
      id: 'duplicate',
      label: '複製',
      onSelect: () => duplicateProjectById(project.id),
    },
    { id: 'rename', label: '名前を変更', onSelect: () => setEditing(true) },
    { id: 'list', label: 'プロジェクト一覧を開く', onSelect: openProjectList },
    {
      id: 'delete',
      label: '削除',
      danger: true,
      onSelect: () => void confirmDeleteProject(project.id, project.name),
    },
  ];

  return (
    <div className="kl-project-controls">
      {editing ? (
        <input
          // key で再マウントし、開くたびに現在の名前から始める (inspector/fields.tsx と同じ非制御入力の流儀)。
          key={project.id}
          className="kl-project-name-input"
          data-testid="toolbar-project-name-input"
          aria-label="プロジェクト名"
          defaultValue={project.name}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              renameCurrentProject(e.currentTarget.value);
              setEditing(false);
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              // アンマウント時に blur が飛んでも確定されないよう、元の名前に戻してから閉じる。
              e.currentTarget.value = project.name;
              setEditing(false);
            }
          }}
          onBlur={(e) => {
            renameCurrentProject(e.currentTarget.value);
            setEditing(false);
          }}
        />
      ) : (
        <button type="button" className="kl-project-name-button" data-testid="toolbar-project-name" title="クリックで名前を変更" onClick={() => setEditing(true)}>
          {project.name}
        </button>
      )}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="kl-toolbar-button"
          data-testid="project-menu-button"
          aria-label="プロジェクトメニュー"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ▾
        </button>
        {menuOpen && <MenuPopover items={items} onClose={closeMenu} testId="project-menu" />}
      </div>
    </div>
  );
}

export default ProjectControls;
