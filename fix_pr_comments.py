import sys

def fix_main_canvas(content):
    search_text = """    const handleKeyDragEnd = useCallback((id: string, x: number, y: number) => {
        const { selectedKeyIds, project, updateKeys, updateKey } = useStore.getState();
        if (selectedKeyIds.length > 1 && selectedKeyIds.includes(id)) {
            // Performance optimization: Create Map for O(1) lookup
            const keysById = new Map(project.keys.map(k => [k.id, k]));
            const draggedKey = keysById.get(id);
            if (!draggedKey) return;

            const deltaX = x - draggedKey.position.x;
            const deltaY = y - draggedKey.position.y;

            type UpdateType = { id: string; data: Partial<import('@/types/mkd').KeyData> };

            const updates = selectedKeyIds.map((selectedId): UpdateType | null => {
                const key = keysById.get(selectedId);
                if (!key) return null;
                return {
                    id: selectedId,
                    data: {
                        position: {
                            x: key.position.x + deltaX,
                            y: key.position.y + deltaY
                        }
                    }
                };
            }).filter((u): u is UpdateType => u !== null);

            updateKeys(updates);
        } else {
            updateKey(id, { position: { x, y } });
        }
    }, []);"""

    replace_text = """    const handleKeyDragEnd = useCallback((id: string, x: number, y: number) => {
        const { selectedKeyIds, project, updateKeys, updateKey } = useStore.getState();
        if (selectedKeyIds.length > 1 && selectedKeyIds.includes(id)) {
            // Performance optimization: Create Map for O(1) lookup
            const keysById = new Map(project.keys.map(k => [k.id, k]));
            const draggedKey = keysById.get(id);
            if (!draggedKey) return;

            const deltaX = x - draggedKey.position.x;
            const deltaY = y - draggedKey.position.y;

            const updates = selectedKeyIds.map((selectedId) => {
                const key = keysById.get(selectedId);
                if (!key) return null;
                return {
                    id: selectedId,
                    data: {
                        position: {
                            x: key.position.x + deltaX,
                            y: key.position.y + deltaY
                        }
                    }
                };
            }).filter((u): u is { id: string; data: Partial<import('@/types/mkd').KeyData> } => u !== null);

            updateKeys(updates);
        } else {
            updateKey(id, { position: { x, y } });
        }
    }, []);"""
    return content.replace(search_text, replace_text)

def fix_key_object(content):
    search_text = """        const updates: { id: string, data: Partial<KeyData> }[] = [];

        // Pivot Center in U units
        const pivotCenterX = data.position.x + data.size.w / 2;
        const pivotCenterY = data.position.y + data.size.h / 2;

        const selectedIdsSet = new Set(currentSelectedIds);
        const currentProject = useStore.getState().project;

        currentProject.keys.forEach(k => {
            if (selectedIdsSet.has(k.id)) {"""

    replace_text = """        const updates: { id: string, data: Partial<KeyData> }[] = [];

        // Pivot Center in U units
        const pivotCenterX = data.position.x + data.size.w / 2;
        const pivotCenterY = data.position.y + data.size.h / 2;

        const selectedIdsSet = new Set(currentSelectedIds);
        const currentProject = useStore.getState().project;

        currentProject.keys.forEach(k => {
            if (selectedIdsSet.has(k.id)) {"""
    # Actually looking at the search text, it seems I already used selectedIdsSet in my previous version of KeyObject.
    # Let me double check KeyObject.tsx content.
    return content

if __name__ == "__main__":
    import os

    with open('components/editor/CanvasArea/MainCanvas.tsx', 'r') as f:
        content = f.read()
    new_content = fix_main_canvas(content)
    with open('components/editor/CanvasArea/MainCanvas.tsx', 'w') as f:
        f.write(new_content)

    # Check KeyObject.tsx
    # It seems I already have the optimization in the file I read earlier.
