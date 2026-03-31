import { FabricImage } from "fabric";
import addImage from "../functions/image";


export default async function Image(src, setSelectedId, setActiveTool, fabricCanvas) {
  let addedImage = false;
  if (!src) return;
  console.log("Image src received:");
  const id = Date.now()

  let fabricImage;
  if (!addedImage) {
    console.log("Adding image to canvas:");
    fabricImage = await FabricImage.fromURL(src, {crossOrigin: 'anonymous'});
    fabricImage.set({
      left: 100,
      top: 100, 
      customId: id,
      selectable: true,
    });
    setSelectedId(id)
    setActiveTool('image')
    addedImage = true;
  }

  if (fabricCanvas && addedImage && fabricImage) {
    fabricCanvas.add(fabricImage);
    fabricCanvas.setActiveObject(fabricImage);
    fabricCanvas.requestRenderAll();
    addedImage = false;
    addImage(fabricImage)
  }

  return fabricImage;
}
