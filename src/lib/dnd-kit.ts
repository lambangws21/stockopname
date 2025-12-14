// src/lib/dnd-kit.ts

import { UniqueIdentifier } from '@dnd-kit/core';

// Status yang akan menjadi ID Kolom (Container)
export type VisitStatus = 'Terjadwal' | 'Selesai' | 'Dibatalkan';

// Tipe Data mentah dari API (Harus memiliki orderIndex)
export type VisitData = {
  id: UniqueIdentifier;
  namaDokter: string;
  rumahSakit: string;
  note: string;
  status: VisitStatus; 
  waktuVisit: string;
  orderIndex: number; // PENTING: Untuk DND dan sinkronisasi Firebase
};

// Tipe Item di Kanban (VisitData tanpa status, karena status diwarisi dari Container)
export type ItemType = Omit<VisitData, 'status'>; 

// Tipe Container (Kolom)
export type ContainerType = {
  id: UniqueIdentifier; // Sama dengan VisitStatus
  title: string;
  items: ItemType[];
};

// Tipe Data keseluruhan untuk state Kanban
export type DndData = {
  [key in VisitStatus]: ContainerType;
};

// Data container statis untuk inisialisasi
export const KANBAN_CONTAINERS: { id: VisitStatus, title: string }[] = [
    { id: 'Terjadwal', title: 'Terjadwal' },
    { id: 'Selesai', title: 'Selesai' },
    { id: 'Dibatalkan', title: 'Dibatalkan' },
];