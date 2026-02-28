import { ref, listAll, deleteObject } from "firebase/storage";
import { storage } from '@/firebase';
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";

// Inside your delete function:
export const deleteDesign = async (designId: string, userId: string) => {
  try {
    // 1. Delete Firestore Doc (You probably already have this)
    await deleteDoc(doc(db, `users/${userId}/designs`, designId));

    // 👇 2. ADD THIS: Recursively delete images folder
    const deleteFolder = async (folderPath: string) => {
      const folderRef = ref(storage, folderPath);
      try {
        const fileList = await listAll(folderRef);
        await Promise.all(fileList.items.map(item => deleteObject(item)));
      } catch (e) { /* Ignore if folder doesn't exist */ }
    };

    await deleteFolder(`users/${userId}/designs/${designId}/images/originals`);
    await deleteFolder(`users/${userId}/designs/${designId}/images/proxies`);

    // 3. Delete Thumbnail
    const thumbRef = ref(storage, `users/${userId}/designs/${designId}/thumbnail.png`);
    await deleteObject(thumbRef).catch(() => { });

  } catch (err) {
    console.error("Delete failed:", err);
  }
};