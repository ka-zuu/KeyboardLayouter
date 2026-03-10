import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { shallow } from 'zustand/shallow';
import { KeyData, Position, ProjectData } from '@/types/mkd';
import { v4 as uuidv4 } from 'uuid';
import { customStorage } from '@/lib/storage';

export interface EditorState {
  project: ProjectData;
  savedProjects: Record<string, ProjectData>; // id -> data
  scale: number;
  pan: Position;
  snapEnabled: boolean;
  gridSize: number;
  selectedKeyIds: string[];
  
  clipboard: KeyData[]; // for copy/paste
  
  // Actions
  setProjectName: (name: string) => void;
  setGridSize: (size: number) => void;
  addKey: (key: Omit<KeyData, 'id'>) => void;
  addKeys: (count: number, baseKey: Omit<KeyData, 'id'>) => void;
  updateKey: (id: string, data: Partial<KeyData>) => void;
  updateKeys: (updates: { id: string; data: Partial<KeyData> }[]) => void;
  removeKey: (id: string) => void;
  deleteSelectedKeys: () => void;
  copyKeys: () => void;
  pasteKeys: () => void;
  duplicateSelectedKeys: () => void;
  moveSelectedKeys: (delta: { x: number; y: number }) => void;
  selectKey: (id: string, multi: boolean) => void;
  selectKeys: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (scale: number) => void;
  setPan: (pan: Position) => void;
  toggleSnap: () => void;
  
  // Project Mgmt
  saveProject: () => void;
  loadProject: (id: string) => void;
  createProject: () => void;
  deleteProject: (id: string) => void;

  // Import
  importProject: (project: ProjectData) => void;
  autoAssignMatrix: (targetIds?: string[], options?: { startRow: number; startCol: number }) => void;
}

const DEFAULT_PROJECT: ProjectData = {
  id: 'default',
  name: 'Untitled Project',
  keys: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};


export const useStore = create<EditorState>()(
  persist(
    temporal(
      (set) => ({
        project: DEFAULT_PROJECT,
        savedProjects: {},
        scale: 1,
        pan: { x: 0, y: 0 },
        snapEnabled: true,
        gridSize: 0.25,
        selectedKeyIds: [],
        clipboard: [],

        setProjectName: (name) =>
          set((state) => ({
            project: { ...state.project, name, updatedAt: Date.now() },
          })),

        setGridSize: (gridSize) => set({ gridSize }),

        addKey: (keyData) =>
          set((state) => {
            const newKey: KeyData = {
              ...keyData,
              id: uuidv4(),
              position: {
                x: Math.max(0, keyData.position.x),
                y: Math.max(0, keyData.position.y),
              }
            };
            return {
              project: {
                ...state.project,
                keys: [...state.project.keys, newKey],
                updatedAt: Date.now(),
              },
            };
          }),

        addKeys: (count: number, baseKey: Omit<KeyData, 'id'>) =>
          set((state) => {
            const newKeys: KeyData[] = Array.from({ length: count }, (_, i) => ({
                ...baseKey,
                id: uuidv4(),
                position: {
                  x: Math.max(0, baseKey.position.x + i * baseKey.size.w),
                  y: Math.max(0, baseKey.position.y),
                },
            }));
            return {
              project: {
                ...state.project,
                keys: [...state.project.keys, ...newKeys],
                updatedAt: Date.now(),
              },
            };
          }),

        updateKey: (id, data) =>
          set((state) => {
            const keys = state.project.keys;
            const index = keys.findIndex(k => k.id === id);

            if (index === -1) return {}; // No change if key not found

            const k = keys[index];
            if (!k) return {}; // Type guard

            const newKey = { ...k, ...data };

            // Deep merge for specific nested objects
            if (data.position) {
              newKey.position = {
                x: Math.max(0, (data.position.x !== undefined ? data.position.x : k.position.x)),
                y: Math.max(0, (data.position.y !== undefined ? data.position.y : k.position.y))
              };
            }
            if (data.size) newKey.size = { ...k.size, ...data.size };
            if (data.rotationCenter) newKey.rotationCenter = { ...k.rotationCenter, ...data.rotationCenter };
            if (data.matrix) newKey.matrix = { ...k.matrix, ...data.matrix };
            if (data.legends) newKey.legends = { ...k.legends, ...data.legends };

            const newKeys = [...keys];
            newKeys[index] = newKey;

            return {
              project: {
                ...state.project,
                keys: newKeys,
                updatedAt: Date.now(),
              },
            };
          }),

        updateKeys: (updates) =>
          set((state) => {
            if (updates.length === 0) return {};

            const keys = state.project.keys;
            const updateMap = new Map(updates.map((u) => [u.id, u.data]));
            const newKeys = [...keys];
            let modified = false;

            for (let i = 0; i < newKeys.length; i++) {
              const k = newKeys[i];
              if (!k) continue; // Type guard

              const data = updateMap.get(k.id);

              if (data) {
                const newKey = { ...k, ...data };

                // Deep merge for specific nested objects
                if (data.position) {
                   newKey.position = {
                     x: Math.max(0, (data.position.x !== undefined ? data.position.x : k.position.x)),
                     y: Math.max(0, (data.position.y !== undefined ? data.position.y : k.position.y))
                   };
                }
                if (data.size) newKey.size = { ...k.size, ...data.size };
                if (data.rotationCenter) newKey.rotationCenter = { ...k.rotationCenter, ...data.rotationCenter };
                if (data.matrix) newKey.matrix = { ...k.matrix, ...data.matrix };
                if (data.legends) newKey.legends = { ...k.legends, ...data.legends };

                newKeys[i] = newKey;
                modified = true;
              }
            }

            if (!modified) return {};

            return {
              project: {
                ...state.project,
                keys: newKeys,
                updatedAt: Date.now(),
              },
            };
          }),

        removeKey: (id) =>
          set((state) => ({
            project: {
              ...state.project,
              keys: state.project.keys.filter((k) => k.id !== id),
              updatedAt: Date.now(),
            },
            selectedKeyIds: state.selectedKeyIds.filter((kid) => kid !== id),
          })),

        deleteSelectedKeys: () =>
          set((state) => {
            if (state.selectedKeyIds.length === 0) return {};
            const selectedSet = new Set(state.selectedKeyIds);
            return {
              project: {
                ...state.project,
                // Optimized to O(N)
                keys: state.project.keys.filter((k) => !selectedSet.has(k.id)),
                updatedAt: Date.now(),
              },
              selectedKeyIds: [],
            };
          }),

        copyKeys: () =>
          set((state) => {
            if (state.selectedKeyIds.length === 0) return {};
            const selectedSet = new Set(state.selectedKeyIds);
            const keysToCopy = state.project.keys.filter((k) =>
              selectedSet.has(k.id)
            );
            return { clipboard: keysToCopy };
          }),

        pasteKeys: () =>
          set((state) => {
            if (!state.clipboard || state.clipboard.length === 0) return {};
            
            // Determine offset to avoid exact overlap (e.g. +0.5U, +0.5U)
            const offset = 0.5;

            const newKeys: KeyData[] = state.clipboard.map((k: KeyData) => ({
              ...k,
              id: uuidv4(),
              position: {
                x: Math.max(0, k.position.x + offset),
                y: Math.max(0, k.position.y + offset),
              },
            }));

            return {
              project: {
                ...state.project,
                keys: [...state.project.keys, ...newKeys],
                updatedAt: Date.now(),
              },
              selectedKeyIds: newKeys.map((k) => k.id), // Select the pasted keys
            };
          }),

        duplicateSelectedKeys: () =>
          set((state) => {
            if (state.selectedKeyIds.length === 0) return {};
            const selectedSet = new Set(state.selectedKeyIds);
            const keysToDuplicate = state.project.keys.filter((k) =>
              selectedSet.has(k.id)
            );

            // Offset for duplication
            const offset = 0.5;

            const newKeys: KeyData[] = keysToDuplicate.map((k) => ({
              ...k,
              id: uuidv4(),
              position: {
                x: k.position.x + offset,
                y: k.position.y + offset,
              },
            }));

            return {
              project: {
                ...state.project,
                keys: [...state.project.keys, ...newKeys],
                updatedAt: Date.now(),
              },
              selectedKeyIds: newKeys.map((k) => k.id), // Select the newly duplicated keys
            };
          }),

        moveSelectedKeys: (delta) =>
          set((state) => {
             if (state.selectedKeyIds.length === 0) return {};
             
             const selectedKeySet = new Set(state.selectedKeyIds);
             return {
               project: {
                 ...state.project,
                 keys: state.project.keys.map(k => {
                    if (!selectedKeySet.has(k.id)) return k;
                    return {
                       ...k,
                       position: {
                          x: Math.max(0, k.position.x + delta.x),
                          y: Math.max(0, k.position.y + delta.y)
                       }
                    };
                 }),
                 updatedAt: Date.now(),
               }
             };
          }),

        selectKey: (id, multi) =>
          set((state) => ({
            selectedKeyIds: multi
              ? state.selectedKeyIds.includes(id)
                ? state.selectedKeyIds.filter((pid) => pid !== id)
                : [...state.selectedKeyIds, id]
              : [id],
          })),

        selectKeys: (ids) => set({ selectedKeyIds: ids }),

        clearSelection: () => set({ selectedKeyIds: [] }),

        setZoom: (scale) => set({ scale }),
        setPan: (pan) => set({ pan }),
        toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
        
        saveProject: () =>
          set((state) => ({
            savedProjects: {
              ...state.savedProjects,
              [state.project.id]: { ...state.project, updatedAt: Date.now() },
            },
          })),
          
        loadProject: (id) =>
          set((state) => {
             const target = state.savedProjects[id];
             if (!target) return {};

             // Migration: visualLegend -> legends.top
             const migratedKeys = target.keys.map(k => {
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const oldK = k as any;
                 if (oldK.visualLegend !== undefined && !k.legends) {
                     return {
                         ...k,
                         legends: { top: oldK.visualLegend, bottom: '', left: '', right: '' },
                         visualLegend: undefined
                     } as KeyData;
                 }
                 if (!k.legends) {
                     return {
                        ...k,
                        legends: { top: '', bottom: '', left: '', right: '' }
                     };
                 }

                 // Migration: tl/tr/bl/br -> top/right/left/bottom
                 const legends = k.legends as Record<string, string | undefined>;
                 if (legends.top === undefined && (legends.tl !== undefined || legends.tr !== undefined)) {
                      return {
                          ...k,
                          legends: {
                              top: legends.tl || '',
                              bottom: legends.br || '',
                              left: legends.bl || '',
                              right: legends.tr || ''
                          }
                      };
                 }

                 return k;
             });

             return {
               project: { ...target, keys: migratedKeys },
               selectedKeyIds: [], // clear selection
             };
          }),
          
        createProject: () =>
          set((state) => {
            const current = state.project;
            const saved: Record<string, ProjectData> = { ...state.savedProjects, [current.id]: current };
            
            const newProject: ProjectData = {
              id: uuidv4(),
              name: 'New Project',
              keys: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            
            return {
              savedProjects: saved,
              project: newProject,
              selectedKeyIds: [],
            };
          }),
          
        deleteProject: (id) =>
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [id]: _deleted, ...rest } = state.savedProjects;
            if (state.project.id === id) {
               const keys = Object.keys(rest);
               if (keys.length > 0) {
                 return { savedProjects: rest, project: rest[keys[0]!]! };
               } else {
                 return { savedProjects: rest, project: { ...DEFAULT_PROJECT, id: uuidv4() } };
               }
            }
            return { savedProjects: rest };
          }),

        importProject: (project) => 
          set(() => ({
            project: { ...project, id: uuidv4() }, 
            selectedKeyIds: [],
          })),
          
        autoAssignMatrix: (targetIds, options = { startRow: 0, startCol: 0 }) =>
          set((state) => {
             // 1. Identify keys to process
             const allKeys = state.project.keys;
             const targetSet = targetIds ? new Set(targetIds) : null;
             const targets = targetSet
               ? allKeys.filter(k => targetSet.has(k.id))
               : allKeys;
               
             if (targets.length === 0) return {};
             
             // 2. Sort targets by position to determine visual order
             // We'll group by "Rough Y" to handle slight misalignments
             const sortedFn = (a: KeyData, b: KeyData) => {
                // Tolerance for row alignment (e.g. 0.5U or similar, let's say 0.25 is enough)
                const yDiff = a.position.y - b.position.y;
                if (Math.abs(yDiff) > 0.1) return yDiff; 
                return a.position.x - b.position.x;
             };
             
             // Sort all targets to find global order within the selection
             const sortedTargets = [...targets].sort(sortedFn);
             
             // 3. Assign row/cols
             const updates = new Map<string, { row: number, col: number }>();
             
             let currentRowY = -9999;
             // Initialize with provided startRow
             let currentRowIndex = options.startRow - 1; // Will increment to startRow on first valid key
             // Initialize with provided startCol
             const startCol = options.startCol;
             let currentColIndex = startCol; 
             
             for (const key of sortedTargets) {
                if (Math.abs(key.position.y - currentRowY) > 0.1) {
                   // New Row
                   currentRowY = key.position.y;
                   currentRowIndex++;
                   currentColIndex = startCol; // Reset to startCol for new row
                } else {
                   // Same Row
                   currentColIndex++;
                }
                
                updates.set(key.id, { row: currentRowIndex, col: currentColIndex });
             }

             return {
                project: {
                   ...state.project,
                   keys: state.project.keys.map(k => {
                      const update = updates.get(k.id);
                      if (!update) return k;
                      return { ...k, matrix: { ...k.matrix, ...update } };
                   }),
                   updatedAt: Date.now(),
                }
             };
          }),
      }),
      {
        partialize: (state) => ({ project: state.project }),
        limit: 50,
        equality: shallow,
      }
    ),
    {
      name: 'mkd-storage',
      storage: customStorage,
      partialize: (state) => ({
         project: state.project,
         savedProjects: state.savedProjects 
      }),
    }
  )
);
