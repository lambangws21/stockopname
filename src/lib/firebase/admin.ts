// lib/firebase/admin.ts
import admin from "firebase-admin";


const serviceAccount = {
  projectId: "data-ok-b4091",

  clientEmail: "firebase-adminsdk-kpje5@data-ok-b4091.iam.gserviceaccount.com",

  privateKey:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDN3Yg4Z7oHObJ/\nYKd6yWhO6jgq1kppVXZ4Gp4aKA5tCop2oQamEhAgOZr/e2czIOxeokvkLTDHYRuV\noS1RozlKfop8CLuZicem4DLvHxRGOuPNJTwFM2XhLLQcjVbHXG0LqpOpsHi30ZaU\nRJc0XQk9RPsNFHDykZ0CDs/no98XN4Nywn01Wmu3OtCsTU8iJhe8VbSk9DZZ2oVW\nK2DbEqdrFB50ag9Kw72JmaO86GDymxe2XuzLYV+6ErjlGbo3ZkFwKj8ZtXy8210W\n4tpCLV62AQ1TOP5UcYSZx3FM/GFlcsnVDXWE+/F3ioE4JJb/Cm2sGs4HiVjz8LlY\n+YJUZKcDAgMBAAECggEACA49qNtiO6sl0XcyRotAEip3JTH6enG2L4/3FNXxbpHl\nhivZ60C0sdYfOxUUnjsRFMjsCFM+X+bsYegLMnEdKk2WVLEwyhrKnbyTMak5LWBb\njqkA1sFCoNOTfrSHK0jyGW1E1vSJXMQOTOH8OrfTRzr+Se49VziceLqkpw9SCQH4\nnrRQ7urW46y9bEVlsWg8D+wZ23zKTPWhU1JWM7umMuAlnHXiyuEwwudOGrRqqFDK\nfIly0WLJJ5Te5qzyINXGgpPU/+1kmDFi+E9xzqq/K6LhFi4eMbOg7loJgWo9alJW\niUZpmF5qSTPF9xIb5b0owiREVFOSWShhvxWF6tvaoQKBgQDvkk7Jo+0rd5zcE4D4\nU3/jzyD4Sg7jqZ4qlj+21GRXWGatpNEJOO5pz1vorDfW13Mzle/HGvjCK7ZCBtzO\nxK7YB3ei/up0jof0HzOYZA4DW3WpQCYlldKO20IOpjVecejWzzRuw57o6DGaiNZu\nrEkupUzFiS5UXGAZuG28Ys4zoQKBgQDb+4LC3iojZdY/KikhK8rw+oQrDTezC0ha\n2rUOysBJu0vp1mLX+WDEkdsA5Dc3bZ20LZ4USUeRykDdVVgKqkdGPEqihHfTdwzE\nljboNs+pxwx934syms03IZmdNA30K9CKGJHqE94Ki3K9LGDHKMXjaFSzCNJwx2hn\nYSFo+AyYIwKBgBIDrmj7KppaJDFoRgpmPPekW5ZP+06jMoGBSsk0r1biDtZ/zjgj\nT8olDYQxbwF4sfDvFVijbpErOEk+utvRblRQO27GPFsHXLG+puKOo38dIXvYlwW8\nfli/o/f2B41Sg2+jpQ2vKAPbcd9s6rLnwZkAVQWFizZMu+0zMQ05YMgBAoGAZwxO\nmNJRkvtlfXlWgv9sta3ks/YhHXIvlr/VCPTZVrCyQvv2mY1sUyiwGp7Nbt2efoTQ\nBFi/ef/wmr4b3AMgGDquC6taJmkiRgTH+8eRR8rCg0RwhGgXsbe/qfB0iOjta4NO\n9wQPg4kHWq6rNyBWcsywwJ1lVwdSVPsfF3j7DVkCgYA/dlfZNFFtcDGvf1n++Tfp\nbYcaPoiQBS3gmgakwO/y3OhHF7aql/aqs6gCx+DxJ+XOilx+3cAu1eB8Eu7hGmbc\n4gqWjDcaP91hkneU3hyLrtkjvBeQ/EoWKsWLRwOAWdlxMvzqWOrDxGyvtUHsxKyT\nuc9eZCVCv0/mt4TwxZ/vEQ==\n-----END PRIVATE KEY-----\n",
};

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        storageBucket: "data-ok-b4091.appspot.com",
      });
      console.log('Firebase Admin SDK berhasil diinisialisasi.');
    } catch (error) {
      console.error('Terjadi error Kritis saat inisialisasi Firebase Admin SDK:', error);
      throw new Error("Gagal menginisialisasi Firebase Admin. Cek kredensial dan log server.");
    }
  }
  return admin;
}

const adminInstance = initializeFirebaseAdmin();

export default adminInstance;

// import admin from 'firebase-admin';

// // Import service account key
// // Pastikan path-nya benar dari root proyek
// import serviceAccount from '../../../firebase-service-account-two.json';

// if (!admin.apps.length) {
//   try {
//     admin.initializeApp({
//       // Casting tipe karena TypeScript mungkin tidak mengenali semua properti
//       credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
//     });
//   } catch  {
//     console.error('Firebase admin initialization error');
//   }
// }

// export default admin;
