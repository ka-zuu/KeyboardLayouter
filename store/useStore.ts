import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { KeyData, Position, ProjectData } from '@/types/mkd';
import { v4 as uuidv4 } from 'uuid';

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
  autoAssignMatrix: (targetIds?: string[]) => void;
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
            const newKey: KeyData = { ...keyData, id: uuidv4() };
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
                  x: baseKey.position.x + i * baseKey.size.w,
                  y: baseKey.position.y,
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
          set((state) => ({
            project: {
              ...state.project,
              keys: state.project.keys.map((k) => {
                 if (k.id !== id) return k;
                 
                 // Deep merge for specific nested objects
                 const newKey = { ...k, ...data };
                 if (data.position) newKey.position = { ...k.position, ...data.position };
                 if (data.size) newKey.size = { ...k.size, ...data.size };
                 if (data.rotationCenter) newKey.rotationCenter = { ...k.rotationCenter, ...data.rotationCenter };
                 if (data.matrix) newKey.matrix = { ...k.matrix, ...data.matrix };
                 if (data.legends) newKey.legends = { ...k.legends, ...data.legends };
                 
                 return newKey;
              }),
              updatedAt: Date.now(),
            },
          })),

        updateKeys: (updates) =>
          set((state) => {
            const updateMap = new Map(updates.map((u) => [u.id, u.data]));
            return {
              project: {
                ...state.project,
                keys: state.project.keys.map((k) => {
                  const data = updateMap.get(k.id);
                  if (!data) return k;

                  // Deep merge for specific nested objects
                  const newKey = { ...k, ...data };
                  if (data.position) newKey.position = { ...k.position, ...data.position };
                  if (data.size) newKey.size = { ...k.size, ...data.size };
                  if (data.rotationCenter) newKey.rotationCenter = { ...k.rotationCenter, ...data.rotationCenter };
                  if (data.matrix) newKey.matrix = { ...k.matrix, ...data.matrix };
                  if (data.legends) newKey.legends = { ...k.legends, ...data.legends };

                  return newKey;
                }),
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
            return {
              project: {
                ...state.project,
                keys: state.project.keys.filter((k) => !state.selectedKeyIds.includes(k.id)),
                updatedAt: Date.now(),
              },
              selectedKeyIds: [],
            };
          }),

        copyKeys: () =>
          set((state) => {
            if (state.selectedKeyIds.length === 0) return {};
            const keysToCopy = state.project.keys.filter((k) =>
              state.selectedKeyIds.includes(k.id)
            );
            return { clipboard: keysToCopy };
          }),

        pasteKeys: () =>
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((state as any).clipboard === undefined || (state as any).clipboard.length === 0) return {};
            
            // Determine offset to avoid exact overlap (e.g. +0.5U, +0.5U)
            const offset = 0.5;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newKeys = (state as any).clipboard.map((k: KeyData) => ({
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
              selectedKeyIds: newKeys.map((k: KeyData) => k.id), // Select the pasted keys
            };
          }),

        moveSelectedKeys: (delta) =>
          set((state) => {
             if (state.selectedKeyIds.length === 0) return {};
             
             return {
               project: {
                 ...state.project,
                 keys: state.project.keys.map(k => {
                    if (!state.selectedKeyIds.includes(k.id)) return k;
                    return {
                       ...k,
                       position: {
                          x: k.position.x + delta.x,
                          y: k.position.y + delta.y
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

             // Migration: visualLegend -> legends.tl
             const migratedKeys = target.keys.map(k => {
                 const oldK = k as unknown as { visualLegend?: string };
                 if (oldK.visualLegend !== undefined && !k.legends) {
                     return {
                         ...k,
                         legends: { tl: oldK.visualLegend, tr: '', bl: '', br: '' },
                         visualLegend: undefined
                     };
                 }
                 if (!k.legends) {
                     return {
                        ...k,
                        legends: { tl: '', tr: '', bl: '', br: '' }
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
            const saved = { ...state.savedProjects, [current.id]: current };
            
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
          
        autoAssignMatrix: (targetIds) =>
          set((state) => {
             // 1. Identify keys to process
             const allKeys = state.project.keys;
             const targets = targetIds 
               ? allKeys.filter(k => targetIds.includes(k.id)) 
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
             // We need to re-group them properly into rows to assign row indices
             // But a simpler approach for "row" and "col" assignment based on "visual grid":
             // Let's iterate and detect "new row" when Y changes significantly
             
             const updates = new Map<string, { row: number, col: number }>();
             
             let currentRowY = -9999;
             let currentRowIndex = -1;
             let currentColIndex = 0;
             
             // If we are updating only a subset, we might want to respect their relative structure
             // OR we just assign 0..N for the selected cluster.
             // Issue #9 says "assign sequential numbers from top-left".
             // Assuming 0-indexed relative to the selection/group.
             
             for (const key of sortedTargets) {
                if (Math.abs(key.position.y - currentRowY) > 0.1) {
                   // New Row
                   currentRowY = key.position.y;
                   currentRowIndex++;
                   currentColIndex = 0;
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
      }
    ),
    {
      name: 'mkd-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
         project: state.project,
         savedProjects: state.savedProjects 
      }),
    }
  )
);
