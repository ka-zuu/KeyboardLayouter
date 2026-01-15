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
  selectedKeyIds: string[];
  
  // Actions
  setProjectName: (name: string) => void;
  addKey: (key: Omit<KeyData, 'id'>) => void;
  addKeys: (count: number, baseKey: Omit<KeyData, 'id'>) => void;
  updateKey: (id: string, data: Partial<KeyData>) => void;
  removeKey: (id: string) => void;
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
      (set, get) => ({
        project: DEFAULT_PROJECT,
        savedProjects: {},
        scale: 1,
        pan: { x: 0, y: 0 },
        snapEnabled: true,
        selectedKeyIds: [],

        setProjectName: (name) =>
          set((state) => ({
            project: { ...state.project, name, updatedAt: Date.now() },
          })),

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
              keys: state.project.keys.map((k) =>
                k.id === id ? { ...k, ...data } : k
              ),
              updatedAt: Date.now(),
            },
          })),

        removeKey: (id) =>
          set((state) => ({
            project: {
              ...state.project,
              keys: state.project.keys.filter((k) => k.id !== id),
              updatedAt: Date.now(),
            },
            selectedKeyIds: state.selectedKeyIds.filter((kid) => kid !== id),
          })),

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
             return {
               project: target,
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
            const { [id]: deleted, ...rest } = state.savedProjects;
            if (state.project.id === id) {
               const keys = Object.keys(rest);
               if (keys.length > 0) {
                 return { savedProjects: rest, project: rest[keys[0]] };
               } else {
                 return { savedProjects: rest, project: { ...DEFAULT_PROJECT, id: uuidv4() } };
               }
            }
            return { savedProjects: rest };
          }),

        importProject: (project) => 
          set((state) => ({
            project: { ...project, id: uuidv4() }, 
            selectedKeyIds: [],
          })),
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
