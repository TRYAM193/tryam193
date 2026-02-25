// src/design-tool/preview3d/Tshirt3DPreview.jsx
import React, { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Decal, Center, Environment } from "@react-three/drei";

// --- 1. CONFIGURATION ---
// These are your "Fixed Values"
const MODEL_CONFIGS = {
  "t-shirt": {
    scale: 0.8,
    position: [0, -0.85, 0],
    cameraZ: 0.5,
    meshes: {
      front: "Body_Front_Node",
      back: "Body_Back_Node",
      leftSleeve: "Sleeves_Node",
      rightSleeve: "Sleeves_Node001",
    },
    frontDecal: { x: 0, y: 1.3, z: 0, scaleX: 0.3, scaleY: 0.33 },
    backDecal: { x: 0, y: 1.3, z: 0, scaleX: 0.3, scaleY: 0.33 },
    decalDepth: 0.6
  },
  "mug": {
    scale: 1.5,
    position: [0, -1.5, 0],
    cameraZ: 0.5,
    fullWrap: true, // Uses UV Mapping
    meshes: { front: "MUG" },
    frontDecal: { x: -0.1, y: -3.1, scaleX: 0.7, scaleY: 0.23 }, 
  },
  "tote": {
    scale: 0.8,
    position: [0, -1.5, 0],
    cameraZ: 2.5,
    meshes: { front: "FRONT", back: "BACK", straps: "STRAPS" },
    frontDecal: { x: 0, y: 1.2, z: -0.13, scaleX: 2, scaleY: 2 },
    backDecal: { x: 0, y: 1.2, z: 0.13, scaleX: 1.8, scaleY: 2 },
    decalDepth: 0.6
  }
};

const resolveConfig = (url) => {
  if (!url) return MODEL_CONFIGS["t-shirt"];
  if (url.includes("mug")) return MODEL_CONFIGS["mug"];
  if (url.includes("tote")) return MODEL_CONFIGS["tote"];
  return MODEL_CONFIGS["t-shirt"];
};

// --- 2. HELPERS ---
function useDesignTexture(url) {
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    if (!url) { setTexture(null); return; }
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      setTexture(tex);
    });
  }, [url]);
  return texture;
}

function CameraRig({ z }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.z = z;
    camera.updateProjectionMatrix();
  }, [z, camera]);
  return null;
}

function CalibrationDecal({ texture, x, y, z, scaleX, scaleY, depth = 0.6, rotation = [0, 0, 0] }) {
  if (!texture) return null;
  return (
    <Decal position={[x, y, z]} rotation={rotation} scale={[scaleX, scaleY, depth]} debug={false}>
      <meshBasicMaterial map={texture} transparent depthTest={true} depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
    </Decal>
  );
}

// --- 3. DYNAMIC MODEL ---
function DynamicModel({ modelUrl, textures, color, frontPos, backPos, config }) {
  const { nodes } = useGLTF(modelUrl);
  const m = config.meshes;

  const frontTex = useDesignTexture(textures?.front);
  const backTex = useDesignTexture(textures?.back);
  const leftTex = useDesignTexture(textures?.leftSleeve || textures?.left);
  const rightTex = useDesignTexture(textures?.rightSleeve || textures?.right);

  // Since we removed sliders, "adjustments" are effectively 0 (offset) and 1 (scale).
  // We use the base positions (frontPos/backPos) directly.
  const finalFront = useMemo(() => ({
    x: frontPos.x,
    y: frontPos.y,
    z: frontPos.z || 0,
    scaleX: frontPos.scaleX || 1,
    scaleY: frontPos.scaleY || 1
  }), [frontPos]);

  const finalBack = useMemo(() => ({
    x: backPos.x,
    y: backPos.y,
    z: backPos.z || 0,
    scaleX: backPos.scaleX || 1,
    scaleY: backPos.scaleY || 1
  }), [backPos]);

  const RenderPart = ({ meshName, tex, decalProps }) => {
    if (!nodes || !nodes[meshName]) return null;
    
    // --- MUG / FULL WRAP LOGIC ---
    if (config.fullWrap && tex) {
      if (decalProps) {
        tex.center.set(0.5, 0.5); 
        const repeatX = 1 / Math.max(decalProps.scaleX, 0.1);
        const repeatY = 1 / Math.max(decalProps.scaleY, 0.1);
        tex.repeat.set(repeatX, repeatY);
        tex.offset.set(decalProps.x * -0.5, decalProps.y * 0.5); 
        tex.needsUpdate = true;
      }

      return (
        <group>
          <mesh geometry={nodes[meshName].geometry} frustumCulled={false}>
            <meshStandardMaterial color={color} metalness={0} roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={nodes[meshName].geometry} frustumCulled={false}>
            <meshStandardMaterial color="white" metalness={0} roughness={0.5} map={tex} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    }

    // --- T-SHIRT / DECAL LOGIC ---
    return (
      <mesh geometry={nodes[meshName].geometry} material={nodes[meshName].material} frustumCulled={false} color={color}>
        <meshStandardMaterial color={color} roughness={0.7} />
        {tex && decalProps && (
          <CalibrationDecal 
            texture={tex} 
            depth={config.decalDepth} 
            {...decalProps} 
          />
        )}
      </mesh>
    );
  };

  return (
    <group position={config.position} scale={config.scale} dispose={null}>
      {/* Front */}
      <RenderPart
        meshName={m.front}
        tex={frontTex}
        decalProps={{
          x: finalFront.x, y: finalFront.y, z: finalFront.z,
          scaleX: finalFront.scaleX, scaleY: finalFront.scaleY,
          rotation: [0, 0, 0]
        }}
      />
      {/* Back */}
      {!config.fullWrap && (
        <RenderPart
          meshName={m.back}
          tex={backTex}
          decalProps={{
            x: finalBack.x, y: finalBack.y, z: finalBack.z,
            scaleX: finalBack.scaleX, scaleY: finalBack.scaleY,
            rotation: [0, Math.PI, 0]
          }}
        />
      )}
      <RenderPart meshName={m.leftSleeve} tex={leftTex} />
      <RenderPart meshName={m.rightSleeve} tex={rightTex} />
      <RenderPart meshName={m.hood} />
      <RenderPart meshName={m.handle} />
      <RenderPart meshName={m.straps} />

      {(!m.front || !nodes[m.front]) && <primitive object={nodes.Scene || nodes.root} />}
    </group>
  );
}

// --- 4. EXPORT COMPONENT ---
export default function Tshirt3DPreview({ modelUrl, textures, color = "#ffffff" }) {
  const config = useMemo(() => resolveConfig(modelUrl), [modelUrl]);
  const [cameraZ] = useState(config.cameraZ || 2.5);
  
  // These states just hold the default config values now
  const [frontPos] = useState(config.frontDecal || { x: 0, y: 0, z: 0.5, scaleX: 1, scaleY: 1 });
  const [backPos] = useState(config.backDecal || { x: 0, y: 0, z: -0.5, scaleX: 1, scaleY: 1 });

  if (!modelUrl) return <div>No 3D Model URL provided</div>;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#111" }}>
      <Canvas fov={45} camera={{ position: [0, 0, cameraZ], near: 0.1, far: 1000 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={1} />
        <Environment preset="city" />
        <CameraRig z={cameraZ} />
        <Center>
          <DynamicModel
            modelUrl={modelUrl}
            textures={textures}
            color={color}
            frontPos={frontPos}
            backPos={backPos}
            config={config}
          />
        </Center>
        <OrbitControls enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI} />
      </Canvas>
    </div>
  );
}