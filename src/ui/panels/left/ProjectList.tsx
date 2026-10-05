import { useProjectStore } from '@/state/appState';
import { duplicateProjectById, switchProject } from '@/state/projectActions';
import { confirmDeleteProject, PROJECT_LIST_SECTION_ID } from './projectListShared';
import { useProjectList } from '@/ui/hooks/useProjectList';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

/** docs/UI_SPEC.md#プロジェクト一覧。 */
function ProjectList() {
  const projects = useProjectList();
  const currentId = useProjectStore((s) => s.project.id);

  return (
    <section id={PROJECT_LIST_SECTION_ID} className="kl-left-section" aria-labelledby="kl-project-list-title" tabIndex={-1}>
      <h2 id="kl-project-list-title" className="kl-left-section-title">
        プロジェクト
      </h2>
      <ul className="kl-project-list" data-testid="project-list">
        {projects.map((p) => {
          const isCurrent = p.id === currentId;
          return (
            <li key={p.id} className="kl-project-item" data-testid={`project-item-${p.id}`} aria-current={isCurrent ? 'true' : undefined}>
              <button
                type="button"
                className="kl-project-open"
                onClick={() => switchProject(p.id)}
                disabled={isCurrent}
                title={isCurrent ? '現在のプロジェクト' : `「${p.name}」を開く`}
              >
                <span className="kl-project-name">{p.name}</span>
                <span className="kl-project-meta">{`${p.keys.length.toString()} キー · ${dateFormat.format(p.updatedAt)}`}</span>
              </button>
              <div className="kl-project-actions">
                <button
                  type="button"
                  className="kl-icon-button"
                  data-testid={`project-duplicate-${p.id}`}
                  aria-label={`「${p.name}」を複製`}
                  title="複製"
                  onClick={() => duplicateProjectById(p.id)}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="kl-icon-button kl-icon-button--danger"
                  data-testid={`project-delete-${p.id}`}
                  aria-label={`「${p.name}」を削除`}
                  title="削除"
                  onClick={() => confirmDeleteProject(p.id, p.name)}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ProjectList;
