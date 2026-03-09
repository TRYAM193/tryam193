import React, { useState, useEffect } from 'react';
import { db, storage } from '@/firebase';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { INITIAL_PRODUCTS } from '@/data/initialProducts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {seedProducts} from '../lib/seed-products'

export default function AdminProductManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // 1. Fetch existing products from Firestore to see what's already there
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "base_products"));
      const dbProducts = querySnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as Record<string, any>);

      // Merge INITIAL_PRODUCTS with DB data (DB takes precedence for images)
      const merged = INITIAL_PRODUCTS.map(p => ({
        ...p,
        ...dbProducts[p.id], // Overwrite local data with DB data (e.g. if image exists)
        existsInDb: !!dbProducts[p.id]
      }));
      
      setProducts(merged);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 2. Seed Data (Write the JSON to Firestore, excluding images if they don't exist)
  const handleSeedData = async () => {
    setLoading(true);
    try {
      const batchPromises = INITIAL_PRODUCTS.map(async (product) => {
        const docRef = doc(db, "base_products", product.id);
        const snap = await getDoc(docRef);
        
        // If it exists, we only update non-image fields to preserve existing uploads
        if (snap.exists()) {
          const { image, ...dataWithoutImage } = product;
          return updateDoc(docRef, dataWithoutImage);
        } else {
          // If new, create it
          return setDoc(docRef, product);
        }
      });

      await Promise.all(batchPromises);
      toast.success("Product data synced to Firestore!");
      await fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to seed data.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Image Upload
  const handleImageUpload = async (productId: string, file: File) => {
    if (!file) return;
    setUploadingId(productId);

    try {
      // A. Create Storage Reference: catalog/{productId}
      // Using the same name overwrites old files, keeping storage clean
      const storageRef = ref(storage, `catalog/${productId}`);
      
      // B. Upload File
      await uploadBytes(storageRef, file);
      
      // C. Get Public URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // D. Update Firestore
      await updateDoc(doc(db, "base_products", productId), {
        image: downloadURL
      });

      toast.success("Image uploaded successfully!");
      
      // Update local state to show the new image immediately
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, image: downloadURL, existsInDb: true } : p
      ));

    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload image.");
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog Manager</h1>
          <p className="text-slate-500">Manage your product data and images.</p>
        </div>
        <Button onClick={handleSeedData}>
          Sync Data Definitions
        </Button>
        <Button onClick={seedProducts}>
          Sync Product Details
        </Button>
      </div>

      <div className="grid gap-6">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-0 flex items-center">
              {/* Image Section */}
              <div className="w-32 h-32 bg-slate-100 flex-shrink-0 flex items-center justify-center relative border-r">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <Upload className="text-slate-300" />
                )}
                {uploadingId === product.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                    <Loader2 className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {product.title}
                      {product.existsInDb && <CheckCircle size={16} className="text-green-500" />}
                    </h3>
                    <div className="flex gap-2 text-xs text-slate-500 mt-1">
                      <span className="bg-slate-100 px-2 py-1 rounded">ID: {product.id}</span>
                      <span className="bg-slate-100 px-2 py-1 rounded">Category: {product.category}</span>
                      <span className="bg-slate-100 px-2 py-1 rounded">${product.price.IN}</span>
                    </div>
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id={`file-${product.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageUpload(product.id, e.target.files[0]);
                        }
                      }}
                    />
                    <label htmlFor={`file-${product.id}`}>
                      <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                        <span>{product.image ? "Change Image" : "Upload Image"}</span>
                      </Button>
                    </label>
                  </div>
                </div>
                
                {!product.existsInDb && (
                  <div className="flex items-center gap-2 mt-2 text-amber-600 text-sm">
                    <AlertCircle size={14} />
                    <span>Not synced to DB yet. Click "Sync Data Definitions".</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}