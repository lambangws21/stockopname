// lib/schemas.ts
import { z } from "zod";

export const VisitSchema = z.object({
  namaDokter: z.string().min(2, "Nama dokter minimal 2 karakter."),
  rumahSakit: z.string().min(2, "Nama rumah sakit minimal 2 karakter."),
  waktuVisit: z.string().min(1, "Waktu visit harus diisi."),
  
  // Status didefinisikan sebagai field WAJIB, dan default-nya diatur di useForm
  status: z.enum(['To Do', 'In Progress', 'Done']),
});

// Tipe ini akan digunakan oleh React Hook Form
export type VisitFormValues = z.infer<typeof VisitSchema>;