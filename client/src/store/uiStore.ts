import { create } from 'zustand';

interface UiState {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  setMenuOpen: (isOpen: boolean) => void;
  
  isFilterOpen: boolean;
  toggleFilter: () => void;
  setFilterOpen: (isOpen: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
  
  isFilterOpen: false,
  toggleFilter: () => set((state) => ({ isFilterOpen: !state.isFilterOpen })),
  setFilterOpen: (isOpen) => set({ isFilterOpen: isOpen }),
}));
