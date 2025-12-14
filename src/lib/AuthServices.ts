import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  deleteUser,
  type User, // 1. Impor tipe User dari Firebase
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase/client';

// Inisialisasi Auth dari instance app client-side Anda
export const auth = getAuth();

// Tipe untuk nilai balik fungsi yang lebih konsisten
interface AuthResponse {
  user?: User | null; // 2. Gunakan tipe User yang spesifik, bukan 'any'
  error: string | null;
}

/**
* Mendaftarkan pengguna baru dengan email, password, dan role.
*/
export async function signUpWithEmail(email: string, password: string, role = 'user'): Promise<AuthResponse> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Simpan data tambahan pengguna ke Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      role: role,
      createdAt: new Date(),
    });
    return { user, error: null };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui saat mendaftar.' };
  }
}

/**
* Melakukan login pengguna dengan email dan password.
*/
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: unknown) {
      return { error: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui saat login.' };
  }
}

/**
* Melakukan logout pengguna yang sedang aktif.
*/
export function logOut() {
  return signOut(auth);
}

/**
* Memperbarui password pengguna yang sedang login.
*/
export async function updateUserPassword(newPassword: string): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) {
      return { error: "Tidak ada pengguna yang sedang login." };
  }
  try {
      await updatePassword(user, newPassword);
      return { error: null };
  } catch (error: unknown) {
      // Firebase akan error jika login sudah terlalu lama, ini adalah pesan yang umum
      if (error instanceof Error && error.message.includes('auth/requires-recent-login')) {
          return { error: 'Harap logout dan login kembali untuk melakukan tindakan ini.' };
      }
      return { error: error instanceof Error ? error.message : 'Gagal memperbarui password.' };
  }
}

/**
* Menghapus akun pengguna yang sedang login.
*/
export async function deleteUserAccount(): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) {
      return { error: "Tidak ada pengguna yang sedang login." };
  }
  try {
      await deleteUser(user);
      return { error: null };
  } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('auth/requires-recent-login')) {
          return { error: 'Harap logout dan login kembali untuk melakukan tindakan ini.' };
      }
      return { error: error instanceof Error ? error.message : 'Gagal menghapus akun.' };
  }
}

