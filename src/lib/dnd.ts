// src/lib/dnd.ts

import { UniqueIdentifier } from '@dnd-kit/core';

export type VisitStatus = 'To Do' | 'In Progress' | 'Done';

// Tipe Data mentah dari Firebase
export type VisitData = {
  id: UniqueIdentifier;
  namaDokter: string;
  rumahSakit: string;
  note: string;
  status: VisitStatus; 
  waktuVisit: string; // Akan diubah menjadi Date/Timestamp di Firestore
  orderIndex: number; // PENTING: Untuk menyimpan urutan DND
};

// Tipe Item di Kanban (sama dengan VisitData)
export type ItemType = VisitData;

// Tipe Container (Kolom)
export type ContainerType = {
  id: UniqueIdentifier;
  title: string;
  items: ItemType[];
};

// Tipe Data keseluruhan untuk state Kanban
export type DndData = {
  [key in VisitStatus]: ContainerType;
};

// Data container statis
export const KANBAN_CONTAINERS: { id: VisitStatus, title: string }[] = [
    { id: 'To Do', title: 'To Do' },
    { id: 'In Progress', title: 'In Progress' },
    { id: 'Done', title: 'Done' },
];