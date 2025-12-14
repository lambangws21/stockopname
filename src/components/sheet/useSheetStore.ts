import { create } from "zustand";
import { PriceItem } from "@/app/api/price-list/route";

interface SheetStore {
  data: PriceItem[];
  loading: boolean;

  editItem: PriceItem | null;
  deleteId: number | null;
  isFormOpen: boolean;
  isDeleteOpen: boolean;

  // FILTER SYSTEM
  filterSystem: string;
  setFilterSystem: (value: string) => void;

  // ACTIONS
  fetchData: () => Promise<void>;
  openAddModal: () => void;
  openEditModal: (item: PriceItem) => void;
  openDeleteModal: (no: number) => void;
  closeModals: () => void;

  createData: (payload: PriceItem) => Promise<void>;
  updateData: (payload: PriceItem) => Promise<void>;
  deleteData: (no: number) => Promise<void>;
}

export const useSheetStore = create<SheetStore>((set, get) => ({
  data: [],
  loading: false,

  editItem: null,
  deleteId: null,
  isFormOpen: false,
  isDeleteOpen: false,

  // default filter
  filterSystem: "ALL",

  // setter filter
  setFilterSystem: (value) => set({ filterSystem: value }),

  // ========================
  // FETCH DATA
  // ========================
  fetchData: async () => {
    set({ loading: true });

    const res = await fetch("/api/price-list", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    set({ data: json.data, loading: false });
  },

  // ========================
  // MODAL CONTROL
  // ========================
  openAddModal: () =>
    set({
      isFormOpen: true,
      editItem: null,
    }),

  openEditModal: (item) =>
    set({
      isFormOpen: true,
      editItem: item,
    }),

  openDeleteModal: (no) =>
    set({
      isDeleteOpen: true,
      deleteId: no,
    }),

  closeModals: () =>
    set({
      isFormOpen: false,
      isDeleteOpen: false,
      editItem: null,
      deleteId: null,
    }),

  // ========================
  // CREATE (POST)
  // ========================
  createData: async (payload) => {
    await fetch("/api/price-list", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    get().fetchData();
  },

  // ========================
  // UPDATE (PUT)
  // ========================
  updateData: async (payload) => {
    await fetch("/api/price-list", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    get().fetchData();
  },

  // ========================
  // DELETE (DELETE)
  // ========================
  deleteData: async (no: number) => {
    await fetch("/api/price-list", {
      method: "DELETE",
      body: JSON.stringify({ no }),
    });

    get().fetchData();
  },
}));
