import { 
    doc, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase/client'; // Pastikan path ini benar

// Tipe untuk objek kategori
interface Category {
    id: string;
    name: string;
}

// Tipe untuk objek pengaturan notifikasi
interface NotificationPreferences {
    weeklyReport: boolean;
    lowBalanceAlert: boolean;
    largeTransactionAlert: boolean;
}

// --- FUNGSI UNTUK NOTIFIKASI ---

/**
 * Mengambil preferensi notifikasi pengguna dari Firestore.
 * @param uid ID pengguna yang unik.
 * @returns Objek preferensi notifikasi, atau null jika tidak ditemukan.
 */
export async function getUserNotificationSettings(uid: string): Promise<NotificationPreferences | null> {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists() && docSnap.data().notificationSettings) {
            return docSnap.data().notificationSettings as NotificationPreferences;
        }
        // Jika belum ada pengaturan, kembalikan nilai default
        return {
            weeklyReport: true,
            lowBalanceAlert: true,
            largeTransactionAlert: false,
        };
    } catch (error) {
        console.error("Error mengambil pengaturan pengguna:", error);
        return null;
    }
}

/**
 * Menyimpan atau memperbarui preferensi notifikasi pengguna di Firestore.
 * @param uid ID pengguna yang unik.
 * @param settings Objek preferensi notifikasi yang baru.
 * @returns Objek yang berisi pesan error jika gagal.
 */
export async function updateUserNotificationSettings(uid: string, settings: NotificationPreferences): Promise<{ error: string | null }> {
    try {
        const userDocRef = doc(db, "users", uid);
        // Gunakan setDoc dengan merge: true untuk membuat atau memperbarui
        // sub-objek 'notificationSettings' tanpa menimpa data pengguna lain.
        await setDoc(userDocRef, { notificationSettings: settings }, { merge: true });
        return { error: null };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui." };
    }
}


// --- FUNGSI UNTUK KATEGORI ---

/**
 * Mengambil semua kategori kustom milik pengguna dari Firestore.
 * Kategori diurutkan berdasarkan nama secara alfabetis.
 * @param uid ID pengguna yang unik.
 * @returns Sebuah promise yang resolve menjadi array dari objek kategori.
 */
export async function getUserCategories(uid: string): Promise<Category[]> {
    try {
        const categoriesColRef = collection(db, "users", uid, "categories");
        const q = query(categoriesColRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    } catch (error) {
        console.error("Error mengambil kategori:", error);
        return []; // Kembalikan array kosong jika terjadi error
    }
}

/**
 * Menambahkan kategori baru untuk pengguna di Firestore.
 * @param uid ID pengguna.
 * @param categoryName Nama kategori baru yang akan ditambahkan.
 * @returns Objek yang berisi pesan error jika gagal, atau null jika berhasil.
 */
export async function addCategory(uid: string, categoryName: string): Promise<{ error: string | null }> {
    try {
        const categoriesColRef = collection(db, "users", uid, "categories");
        await addDoc(categoriesColRef, { name: categoryName });
        return { error: null };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : "Gagal menambahkan kategori." };
    }
}

/**
 * Memperbarui nama kategori yang sudah ada di Firestore.
 * @param uid ID pengguna.
 * @param categoryId ID dokumen kategori yang akan diperbarui.
 * @param newName Nama baru untuk kategori.
 * @returns Objek yang berisi pesan error jika gagal, atau null jika berhasil.
 */
export async function updateCategory(uid: string, categoryId: string, newName: string): Promise<{ error: string | null }> {
    try {
        const categoryDocRef = doc(db, "users", uid, "categories", categoryId);
        await updateDoc(categoryDocRef, { name: newName });
        return { error: null };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : "Gagal memperbarui kategori." };
    }
}

/**
 * Menghapus kategori dari pengguna di Firestore.
 * @param uid ID pengguna.
 * @param categoryId ID dokumen kategori yang akan dihapus.
 * @returns Objek yang berisi pesan error jika gagal, atau null jika berhasil.
 */
export async function deleteCategory(uid: string, categoryId: string): Promise<{ error: string | null }> {
    try {
        const categoryDocRef = doc(db, "users", uid, "categories", categoryId);
        await deleteDoc(categoryDocRef);
        return { error: null };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : "Gagal menghapus kategori." };
    }
}

