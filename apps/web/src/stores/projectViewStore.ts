import { create } from 'zustand';

interface ProjectViewState {
  selectedFlight: any | null;
  setSelectedFlight: (f: any | null) => void;

  // For processed mode: which layer is active
  activeLayer: 'orthomosaic' | '3d' | 'elevation' | 'terrain' | 'pointcloud' | null;
  setActiveLayer: (l: 'orthomosaic' | '3d' | 'elevation' | 'terrain' | 'pointcloud' | null) => void;

  // Left panel state
  leftPanelOpen: boolean;
  toggleLeftPanel: () => void;

  reset: () => void;
}

export const useProjectViewStore = create<ProjectViewState>((set) => ({
  selectedFlight: null,
  setSelectedFlight: (f) => set({ selectedFlight: f, activeLayer: f?.processing_status === 'processed' ? 'orthomosaic' : null }),

  activeLayer: null,
  setActiveLayer: (l) => set({ activeLayer: l }),

  leftPanelOpen: true,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),

  reset: () => set({ selectedFlight: null, activeLayer: null, leftPanelOpen: true }),
}));
