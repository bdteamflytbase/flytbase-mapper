import { create } from 'zustand';

interface SelectionStore {
  // Selected file _ids to process
  selectedFileIds: Set<string>;
  // Which flights are checked (flight_id)
  selectedFlightIds: Set<string>;
  // User-deselected file _ids
  deselectedFileIds: Set<string>;

  // Pre-fetched download info for selected files
  fileDownloadInfo: Map<string, { file_id: string; url: string; name: string }>;

  initFromFlights: (flights: any[]) => void;
  toggleFile: (fileId: string, flightId: string, url: string, name: string, allFlightFileIds: string[]) => void;
  toggleFlight: (flightId: string, files: any[]) => void;
  selectAllInFlight: (flightId: string, files: any[]) => void;
  clearAllInFlight: (flightId: string, files: any[]) => void;
  reset: () => void;
  getSelectedCount: () => number;
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedFileIds: new Set(),
  selectedFlightIds: new Set(),
  deselectedFileIds: new Set(),
  fileDownloadInfo: new Map(),

  initFromFlights: (flights) => {
    const selectedFileIds = new Set<string>();
    const selectedFlightIds = new Set<string>();
    const fileDownloadInfo = new Map<string, any>();

    for (const flight of flights) {
      if (flight.is_processed) continue;
      selectedFlightIds.add(flight.flight_id);
      for (const f of flight.files ?? []) {
        selectedFileIds.add(f._id);
        fileDownloadInfo.set(f._id, { file_id: f._id, url: f.data_url ?? f.thumbnail_url, name: f.file_name });
      }
    }
    set({ selectedFileIds, selectedFlightIds, deselectedFileIds: new Set(), fileDownloadInfo });
  },

  toggleFile: (fileId, flightId, url, name, allFlightFileIds) => {
    const { selectedFileIds, deselectedFileIds, selectedFlightIds, fileDownloadInfo } = get();
    const next = new Set(selectedFileIds);
    const nextDesel = new Set(deselectedFileIds);
    const nextInfo = new Map(fileDownloadInfo);
    const nextFlight = new Set(selectedFlightIds);

    if (next.has(fileId)) {
      next.delete(fileId);
      nextDesel.add(fileId);
      nextInfo.delete(fileId);
      // If all files in this flight are deselected, uncheck the flight
      if (allFlightFileIds.every((id) => !next.has(id))) nextFlight.delete(flightId);
    } else {
      next.add(fileId);
      nextDesel.delete(fileId);
      nextInfo.set(fileId, { file_id: fileId, url, name });
      nextFlight.add(flightId);
    }
    set({ selectedFileIds: next, deselectedFileIds: nextDesel, selectedFlightIds: nextFlight, fileDownloadInfo: nextInfo });
  },

  toggleFlight: (flightId, files) => {
    const { selectedFlightIds } = get();
    if (selectedFlightIds.has(flightId)) {
      get().clearAllInFlight(flightId, files);
    } else {
      get().selectAllInFlight(flightId, files);
    }
  },

  selectAllInFlight: (flightId, files) => {
    const { selectedFileIds, deselectedFileIds, selectedFlightIds, fileDownloadInfo } = get();
    const next = new Set(selectedFileIds);
    const nextDesel = new Set(deselectedFileIds);
    const nextInfo = new Map(fileDownloadInfo);
    const nextFlight = new Set(selectedFlightIds);
    nextFlight.add(flightId);
    for (const f of files) {
      next.add(f._id);
      nextDesel.delete(f._id);
      nextInfo.set(f._id, { file_id: f._id, url: f.data_url ?? f.thumbnail_url, name: f.file_name });
    }
    set({ selectedFileIds: next, deselectedFileIds: nextDesel, selectedFlightIds: nextFlight, fileDownloadInfo: nextInfo });
  },

  clearAllInFlight: (flightId, files) => {
    const { selectedFileIds, deselectedFileIds, selectedFlightIds, fileDownloadInfo } = get();
    const next = new Set(selectedFileIds);
    const nextDesel = new Set(deselectedFileIds);
    const nextInfo = new Map(fileDownloadInfo);
    const nextFlight = new Set(selectedFlightIds);
    nextFlight.delete(flightId);
    for (const f of files) {
      next.delete(f._id);
      nextDesel.add(f._id);
      nextInfo.delete(f._id);
    }
    set({ selectedFileIds: next, deselectedFileIds: nextDesel, selectedFlightIds: nextFlight, fileDownloadInfo: nextInfo });
  },

  reset: () => set({
    selectedFileIds: new Set(),
    selectedFlightIds: new Set(),
    deselectedFileIds: new Set(),
    fileDownloadInfo: new Map(),
  }),

  getSelectedCount: () => get().selectedFileIds.size,
}));
