import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase/client'; // Pastikan path ini benar

// Tipe untuk objek notifikasi
export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp; // Tipe spesifik untuk timestamp Firestore
  link?: string;
}

/**
 * Mendengarkan perubahan notifikasi untuk pengguna secara real-time.
 * @param uid ID pengguna.
 * @param callback Fungsi yang akan dipanggil setiap kali ada pembaruan notifikasi.
 * @returns Fungsi untuk berhenti mendengarkan (unsubscribe).
 */
export function listenForNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void
) {
  const notifsRef = collection(db, "users", uid, "notifications");
  const q = query(notifsRef, orderBy("createdAt", "desc"), limit(10)); // Ambil 10 notifikasi terbaru

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as Notification);
    });
    callback(notifications);
  });

  return unsubscribe; // Kembalikan fungsi unsubscribe
}

/**
 * Menandai notifikasi sebagai sudah dibaca.
 * @param uid ID pengguna.
 * @param notificationId ID dokumen notifikasi.
 */
export async function markNotificationAsRead(uid: string, notificationId: string): Promise<void> {
    try {
        const notifDocRef = doc(db, "users", uid, "notifications", notificationId);
        await updateDoc(notifDocRef, { isRead: true });
    } catch (error) {
        console.error("Gagal menandai notifikasi sebagai dibaca:", error);
    }
}

