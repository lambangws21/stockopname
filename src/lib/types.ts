// lib/types.ts
export type VisitStatus = 'Terjadwal' | 'Selesai' | 'Dibatalkan';

export interface VisitDokter {
  id: string; 
  namaDokter: string;
  rumahSakit: string;
  status: VisitStatus;
  note: string;
  waktuVisit: string; // ISO string, cth: "2025-10-27T09:00:00.000Z"
  durasiMenit?: number; // Default 60 menit
}

