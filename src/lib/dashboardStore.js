import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  pageData: {},
  setPageData: (page, data) => set((state) => ({
    pageData: { ...state.pageData, [page]: data }
  })),
}));