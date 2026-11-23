'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createDocumentTexture, createStampMarkTexture } from './textures';
import { playStampThud, playScanChime } from '@/lib/audio';

export interface DeskSceneProps {
  scrollProgress: number; // 0 to 1
  packet: 'A' | 'B';
  activeDoc: 'deed' | 'khatian' | 'nid' | null;
  setActiveDoc: (doc: 'deed' | 'khatian' | 'nid' | null) => void;
  hoveredDoc: 'deed' | 'khatian' | 'nid' | null;
  setHoveredDoc: (doc: 'deed' | 'khatian' | 'nid' | null) => void;
  hoveredHotspot: string | null;
  setHoveredHotspot: (spot: string | null) => void;
  soundEnabled: boolean;
  isMobile?: boolean;
  replayTrigger?: number;
}

export function DeskScene({
  scrollProgress,
  packet,
  activeDoc,
  setActiveDoc,
  hoveredDoc,
  setHoveredDoc,
  setHoveredHotspot,
  soundEnabled,
  isMobile = false,
  replayTrigger = 0,
}: DeskSceneProps) {

  // Damped scroll progress
  const smoothP = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });
  const hasTriggeredStampAudio = useRef(false);
  const hasTriggeredScanAudio = useRef(false);

  // References
  const deedGroup = useRef<THREE.Group>(null);
  const khatianGroup = useRef<THREE.Group>(null);
  const nidGroup = useRef<THREE.Group>(null);
  const stampGroup = useRef<THREE.Group>(null);
  const stampMark = useRef<THREE.Mesh>(null);
  const scanLine = useRef<THREE.Mesh>(null);
  const scanGlow = useRef<THREE.Mesh>(null);
  const matchLinesRef = useRef<THREE.LineSegments>(null);
  const mismatchLineRef = useRef<THREE.LineSegments>(null);
  const lampLight = useRef<THREE.PointLight>(null);

  // 2048px Ultra High Resolution Textures
  const deedTex = useMemo(() => createDocumentTexture('deed', packet), [packet]);
  const khatianTex = useMemo(() => createDocumentTexture('khatian', packet), [packet]);
  const nidTex = useMemo(() => createDocumentTexture('nid', packet), [packet]);
  const stampMarkTex = useMemo(() => createStampMarkTexture(packet), [packet]);

  // Scaled Geometries (~60% of viewport width across triad)
  const deedGeo = useMemo(() => new THREE.BoxGeometry(2.7, 0.024, 3.8), []);
  const khatianGeo = useMemo(() => new THREE.BoxGeometry(2.7, 0.024, 3.8), []);
  const nidGeo = useMemo(() => new THREE.BoxGeometry(2.3, 0.024, 3.2), []);

  // Cross-Audit Correlation Lines Points (Step 3)
  const { matchPoints, mismatchPoints } = useMemo(() => {
    // Khatian reference parity vector: Deed Khatian 1087 -> Khatian 1087
    const matchPts = [
      new THREE.Vector3(-1.4, 0.48, 0.6),
      new THREE.Vector3(0.35, 0.50, 0.0),
    ];
    // Dag reference vector: Deed Dag 412 -> Khatian Dag (412 or 421)
    const mismatchPts = [
      new THREE.Vector3(-2.1, 0.48, 0.4),
      new THREE.Vector3(-0.2, 0.50, -0.2),
    ];
    return {
      matchPoints: new THREE.BufferGeometry().setFromPoints(matchPts),
      mismatchPoints: new THREE.BufferGeometry().setFromPoints(mismatchPts),
    };
  }, []);

  // Listen to mouse movement for 4° subtle parallax
  useEffect(() => {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReducedMotion) return;

    const onPointerMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', onPointerMove);
  }, []);

  // Handle replay trigger
  useEffect(() => {
    if (replayTrigger > 0) {
      hasTriggeredStampAudio.current = false;
    }
  }, [replayTrigger]);

  useFrame((state, delta) => {
    const targetP = Math.max(0, Math.min(1, scrollProgress));
    // High-precision frame-rate independent exponential damping for buttery smooth motion
    const damping = 1 - Math.exp(-delta * 6.5);
    smoothP.current += (targetP - smoothP.current) * damping;
    const p = smoothP.current;
    const time = state.clock.getElapsedTime();

    // ── 1. ATMOSPHERIC WARM LAMP FLICKER ────────────────────────────
    if (lampLight.current) {
      lampLight.current.intensity = 2.8 + Math.sin(time * 1.8) * 0.12;
    }

    // ── 2. STAGE 1: INGESTION & FAN-OUT (0.00 -> 0.25) ──────────────
    // Natural fanned triad filling ~60% of desk width
    const fanNorm = Math.min(1, p / 0.25);
    const easeFan = THREE.MathUtils.smoothstep(fanNorm, 0, 1);
    const gatherInStep4 = p >= 0.75 ? THREE.MathUtils.smoothstep((p - 0.75) / 0.25, 0, 1) : 0;
    const spreadMultiplier = 1 - gatherInStep4 * 0.45;

    // Desktop vs Mobile lateral spread
    const lateralSpread = isMobile ? 1.8 : 2.85;

    // Deed Sheet (Left)
    if (deedGroup.current) {
      const isHovered = hoveredDoc === 'deed';
      const isPeerHovered = hoveredDoc !== null && !isHovered;
      const targetX = -lateralSpread * (0.42 + 0.58 * easeFan) * spreadMultiplier;
      const targetY = (isHovered ? 0.38 : 0.22) + easeFan * 0.12;
      const targetZ = 0.1 + easeFan * 0.1;

      deedGroup.current.position.x = THREE.MathUtils.lerp(deedGroup.current.position.x, targetX, delta * 10);
      deedGroup.current.position.y = THREE.MathUtils.lerp(deedGroup.current.position.y, targetY, delta * 10);
      deedGroup.current.position.z = THREE.MathUtils.lerp(deedGroup.current.position.z, targetZ, delta * 10);

      // Subtle tilt on hover
      const hoverTilt = isHovered ? -0.06 : 0;
      deedGroup.current.rotation.y = THREE.MathUtils.lerp(deedGroup.current.rotation.y, -0.08 * spreadMultiplier + hoverTilt, delta * 8);
      deedGroup.current.rotation.z = THREE.MathUtils.lerp(deedGroup.current.rotation.z, 0.025, delta * 8);

      // Peer dimming
      const mat = (deedGroup.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = isPeerHovered ? 0.6 : 1.0;
    }

    // Khatian Sheet (Center)
    if (khatianGroup.current) {
      const isHovered = hoveredDoc === 'khatian';
      const isPeerHovered = hoveredDoc !== null && !isHovered;
      const targetY = (isHovered ? 0.44 : 0.26) + easeFan * 0.14;

      khatianGroup.current.position.x = 0;
      khatianGroup.current.position.y = THREE.MathUtils.lerp(khatianGroup.current.position.y, targetY, delta * 10);
      khatianGroup.current.position.z = THREE.MathUtils.lerp(khatianGroup.current.position.z, -0.05, delta * 10);
      khatianGroup.current.rotation.y = THREE.MathUtils.lerp(khatianGroup.current.rotation.y, isHovered ? 0.04 : 0.005, delta * 8);

      const mat = (khatianGroup.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = isPeerHovered ? 0.6 : 1.0;
    }

    // NID Smart Card (Right)
    if (nidGroup.current) {
      const isHovered = hoveredDoc === 'nid';
      const isPeerHovered = hoveredDoc !== null && !isHovered;
      const targetX = lateralSpread * (0.42 + 0.58 * easeFan) * spreadMultiplier;
      const targetY = (isHovered ? 0.36 : 0.20) + easeFan * 0.10;
      const targetZ = 0.1 + easeFan * 0.1;

      nidGroup.current.position.x = THREE.MathUtils.lerp(nidGroup.current.position.x, targetX, delta * 10);
      nidGroup.current.position.y = THREE.MathUtils.lerp(nidGroup.current.position.y, targetY, delta * 10);
      nidGroup.current.position.z = THREE.MathUtils.lerp(nidGroup.current.position.z, targetZ, delta * 10);

      const hoverTilt = isHovered ? 0.06 : 0;
      nidGroup.current.rotation.y = THREE.MathUtils.lerp(nidGroup.current.rotation.y, 0.09 * spreadMultiplier + hoverTilt, delta * 8);
      nidGroup.current.rotation.z = THREE.MathUtils.lerp(nidGroup.current.rotation.z, -0.03, delta * 8);

      const mat = (nidGroup.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = isPeerHovered ? 0.6 : 1.0;
    }

    // ── 3. STAGE 2: MULTIMODAL EXTRACTION SCAN (0.25 -> 0.50) ───────
    if (scanLine.current && scanGlow.current) {
      if (p >= 0.25 && p <= 0.50) {
        scanLine.current.visible = true;
        scanGlow.current.visible = true;

        const scanNorm = Math.min(1, Math.max(0, (p - 0.25) / 0.25));
        const scanZ = THREE.MathUtils.lerp(-2.0, 2.0, scanNorm);

        scanLine.current.position.z = scanZ;
        scanGlow.current.position.z = scanZ - 0.3;

        // Thin vermillion optical scan line
        const pulse = 0.75 + Math.sin(time * 18) * 0.25;
        (scanLine.current.material as THREE.MeshBasicMaterial).opacity = pulse;

        // Sound trigger once when scan starts
        if (!hasTriggeredScanAudio.current && p > 0.26) {
          hasTriggeredScanAudio.current = true;
          playScanChime(soundEnabled);
        }
      } else {
        scanLine.current.visible = false;
        scanGlow.current.visible = false;
        if (p < 0.24) hasTriggeredScanAudio.current = false;
      }
    }

    // ── 4. STAGE 3: DETERMINISTIC CROSS-AUDIT (0.50 -> 0.75) ────────
    const showAuditVectors = p >= 0.50 && p < 0.75;
    if (matchLinesRef.current) {
      matchLinesRef.current.visible = showAuditVectors;
    }
    if (mismatchLineRef.current) {
      mismatchLineRef.current.visible = showAuditVectors;
      if (showAuditVectors) {
        // Red pulse on Dag 412 vs 421 mismatch (Packet B) or solid brass (Packet A)
        const lineMat = mismatchLineRef.current.material as THREE.LineBasicMaterial;
        if (packet === 'B') {
          lineMat.color.set('#e8534a');
          lineMat.opacity = 0.7 + Math.sin(time * 12) * 0.3;
        } else {
          lineMat.color.set('#27864a');
          lineMat.opacity = 0.9;
        }
      }
    }

    // ── 5. STAGE 4: STATUTORY VERDICT & STAMP IMPACT (0.75 -> 1.00) ─
    if (stampGroup.current) {
      if (p >= 0.75) {
        stampGroup.current.visible = true;

        let stampY: number;
        let shake = 0;

        if (p < 0.82) {
          // Rapid descent from above the desk (0.75 -> 0.82)
          const descentNorm = (p - 0.75) / 0.07;
          stampY = THREE.MathUtils.lerp(3.8, 0.52, descentNorm * descentNorm);
          stampGroup.current.rotation.y = THREE.MathUtils.lerp(0.8, 0, descentNorm);
        } else if (p < 0.86) {
          // Physical impact compression with subtle camera thud (0.82 -> 0.86)
          const bounceNorm = (p - 0.82) / 0.04;
          stampY = 0.52 + Math.sin(bounceNorm * Math.PI) * 0.08;
          shake = Math.sin(bounceNorm * Math.PI * 4) * 0.016 * (1 - bounceNorm);
          stampGroup.current.rotation.y = 0;

          if (!hasTriggeredStampAudio.current) {
            hasTriggeredStampAudio.current = true;
            playStampThud(soundEnabled);
          }
        } else {
          // ── THE GENEROUS STAMP PAUSE (0.86 -> 1.00) ───────────────
          // The stamp rests firmly on the stack so users can clearly see the verdict!
          stampY = 0.52;
          stampGroup.current.rotation.y = 0;
        }

        stampGroup.current.position.y = stampY;

        // Stamp impression visible on paper stack
        if (stampMark.current) {
          stampMark.current.visible = p >= 0.82;
          const markMat = stampMark.current.material as THREE.MeshBasicMaterial;
          markMat.opacity = p >= 0.85 ? 0.96 : Math.min(0.96, (p - 0.82) * 30);
        }

        // Camera micro-shake on impact
        if (shake !== 0) {
          state.camera.position.y += shake;
        }
      } else {
        stampGroup.current.visible = false;
        if (stampMark.current) stampMark.current.visible = false;
        if (p < 0.72) hasTriggeredStampAudio.current = false;
      }
    }

    // ── 6. DYNAMIC CAMERA ORBIT & CLOSE-UP GLIDE ────────────────────
    let targetCamPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    const docShift = isMobile ? 0 : 2.3;

    if (activeDoc === 'deed') {
      targetCamPos = new THREE.Vector3(docShift - 2.2, 3.4, 2.8);
      targetLookAt = new THREE.Vector3(docShift - 2.2, 0.4, 0.2);
    } else if (activeDoc === 'khatian') {
      targetCamPos = new THREE.Vector3(docShift, 3.4, 2.6);
      targetLookAt = new THREE.Vector3(docShift, 0.4, -0.1);
    } else if (activeDoc === 'nid') {
      targetCamPos = new THREE.Vector3(docShift + 2.2, 3.2, 2.7);
      targetLookAt = new THREE.Vector3(docShift + 2.2, 0.4, 0.2);
    } else {
      // Default cinematic desk overview with subtle mouse parallax (max 4°)
      const parallaxX = mousePos.current.x * 0.35;
      const parallaxY = mousePos.current.y * 0.25;
      const idleDriftX = Math.sin(time * 0.4) * 0.08;
      const idleDriftY = Math.cos(time * 0.3) * 0.06;

      const baseCamX = isMobile ? 0 : 1.1;
      const baseCamY = isMobile ? 7.6 : 6.2;
      const baseCamZ = isMobile ? 6.2 : 5.4;

      targetCamPos = new THREE.Vector3(
        baseCamX + parallaxX + idleDriftX,
        baseCamY + parallaxY + idleDriftY,
        baseCamZ
      );
      targetLookAt = new THREE.Vector3(isMobile ? 0.3 : 1.55, 0.3, 0.0);
    }

    state.camera.position.lerp(targetCamPos, delta * 4);
    state.camera.lookAt(targetLookAt);
  });

  return (
    <group>
      {/* ── 1. STUDIO LIGHTING RIG (WARM KEY, COOL FILL, SUBTLE ACCENT) ─ */}
      <ambientLight intensity={0.42} color="#e5dacb" />

      {/* Warm brass desk lamp key light */}
      <pointLight
        ref={lampLight}
        position={[-4.2, 5.2, 2.2]}
        intensity={2.8}
        color="#ffcc80"
        distance={12}
        decay={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Weak cool directional fill */}
      <directionalLight position={[4.5, 9.0, 3.5]} intensity={1.1} color="#eaf0f8" castShadow />

      {/* Subtle green ambient accent (echoing bottle-green heritage) */}
      <pointLight position={[3.2, 2.4, -1.2]} intensity={0.75} color="#40916c" distance={7} />

      {/* ── 2. DESK SURFACE: MAHOGANY LEATHER TABLETOP ───────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#1a1411" roughness={0.78} metalness={0.12} />
      </mesh>

      {/* ── 3. PHYSICAL DESK ACCESSORIES (GROUNDED REGISTRY PROPS) ───── */}
      {/* Heavy Oxblood Leather Desk Blotter */}
      <group position={[0, -0.015, 0.2]} receiveShadow>
        {/* Leather Mat Body */}
        <mesh receiveShadow>
          <boxGeometry args={[14.8, 0.025, 9.2]} />
          <meshStandardMaterial color="#241a16" roughness={0.85} metalness={0.08} />
        </mesh>
        {/* Fine Brass Perimeter Border Stitched Trim */}
        <mesh position={[0, 0.014, 0]}>
          <boxGeometry args={[14.86, 0.004, 9.26]} />
          <meshStandardMaterial color="#b08d57" roughness={0.35} metalness={0.8} />
        </mesh>
        {/* 4 Brass Corner Caps */}
        {[
          [-7.4, 4.6],
          [7.4, 4.6],
          [-7.4, -4.6],
          [7.4, -4.6],
        ].map(([cx, cz], i) => (
          <mesh key={i} position={[cx, 0.016, cz]}>
            <boxGeometry args={[0.5, 0.01, 0.5]} />
            <meshStandardMaterial color="#c5a059" roughness={0.3} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* 30cm Brass Desk Scale Ruler (Resting at top of blotter) */}
      <group position={[0, 0.01, -3.8]} rotation={[0, 0.02, 0]} castShadow>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6.6, 0.035, 0.42]} />
          <meshStandardMaterial color="#c5a059" roughness={0.25} metalness={0.9} />
        </mesh>
        {/* Millimeter gauge bevel */}
        <mesh position={[0, 0.02, 0.18]}>
          <boxGeometry args={[6.5, 0.005, 0.06]} />
          <meshStandardMaterial color="#8c734b" roughness={0.5} />
        </mesh>
      </group>

      {/* Hexagonal Registry Glass Ink Pot with Brass Collar (Left corner) */}
      <group position={[-6.2, 0.32, -3.2]} castShadow>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.38, 0.46, 0.65, 8]} />
          <meshPhysicalMaterial
            color="#0f0c0a"
            roughness={0.15}
            transmission={0.4}
            thickness={0.8}
            metalness={0.1}
          />
        </mesh>
        {/* Polished Brass Cap */}
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, 0.12, 16]} />
          <meshStandardMaterial color="#d4b483" roughness={0.25} metalness={0.9} />
        </mesh>
      </group>

      {/* Turned Wooden & Brass Registry Stylus / Pen (Resting diagonally) */}
      <group position={[-4.8, 0.04, -3.1]} rotation={[0, -0.42, 0]} castShadow>
        {/* Wooden Handle */}
        <mesh castShadow>
          <cylinderGeometry args={[0.038, 0.065, 2.4, 16]} />
          <meshStandardMaterial color="#3a271c" roughness={0.45} />
        </mesh>
        {/* Brass Grip Collar */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.048, 0.25, 16]} />
          <meshStandardMaterial color="#c5a059" roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Brass Pen Nib */}
        <mesh position={[0, 1.34, 0]} castShadow>
          <coneGeometry args={[0.04, 0.18, 16]} />
          <meshStandardMaterial color="#e8c78c" roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* ── 4. DOCUMENT TRIAD & STAGE ANIMATIONS (RIGHT-ANCHORED REGISTRY SPREAD) ── */}
      <group position={[isMobile ? 0 : 2.3, 0, 0]}>
        {/* ── DOCUMENT 1: SAF KABALA PROPERTY DEED ────────────────── */}
        <group
          ref={deedGroup}
          position={[-2.85, 0.22, 0.1]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredDoc('deed');
          }}
          onPointerOut={() => setHoveredDoc(null)}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDoc(activeDoc === 'deed' ? null : 'deed');
          }}
        >
          <mesh geometry={deedGeo} castShadow receiveShadow>
            <meshStandardMaterial
              map={deedTex}
              roughness={0.7}
              metalness={0.0}
              transparent
              opacity={1}
            />
          </mesh>

          {/* Stage 02 Interactive Hotspot: Dag 412 */}
          {scrollProgress >= 0.25 && (
            <mesh
              position={[-0.45, 0.04, 0.4]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredHotspot('Deed Dag 412 (তফসিল দাগ)');
              }}
              onPointerOut={() => setHoveredHotspot(null)}
            >
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color="#2d6a4f" />
            </mesh>
          )}
        </group>

        {/* ── DOCUMENT 2: RS KHATIAN RECORD OF RIGHTS ─────────────── */}
        <group
          ref={khatianGroup}
          position={[0, 0.26, -0.05]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredDoc('khatian');
          }}
          onPointerOut={() => setHoveredDoc(null)}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDoc(activeDoc === 'khatian' ? null : 'khatian');
          }}
        >
          <mesh geometry={khatianGeo} castShadow receiveShadow>
            <meshStandardMaterial
              map={khatianTex}
              roughness={0.7}
              metalness={0.0}
              transparent
              opacity={1}
            />
          </mesh>

          {/* Stage 02 Interactive Hotspot: Dag 421 or 412 */}
          {scrollProgress >= 0.25 && (
            <mesh
              position={[0.2, 0.04, -0.2]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredHotspot(
                  packet === 'B'
                    ? 'Khatian Dag 421 (Discrepancy: Dag 412 ≠ 421)'
                    : 'Khatian Dag 412 (Exact Parity)'
                );
              }}
              onPointerOut={() => setHoveredHotspot(null)}
            >
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshBasicMaterial color={packet === 'B' ? '#c0392b' : '#27864a'} />
            </mesh>
          )}
        </group>

        {/* ── DOCUMENT 3: NATIONAL ID SMART CARD ──────────────────── */}
        <group
          ref={nidGroup}
          position={[2.85, 0.20, 0.1]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredDoc('nid');
          }}
          onPointerOut={() => setHoveredDoc(null)}
          onClick={(e) => {
            e.stopPropagation();
            setActiveDoc(activeDoc === 'nid' ? null : 'nid');
          }}
        >
          <mesh geometry={nidGeo} castShadow receiveShadow>
            <meshStandardMaterial
              map={nidTex}
              roughness={0.52}
              metalness={0.08}
              transparent
              opacity={1}
            />
          </mesh>

          {/* Stage 02 Interactive Hotspot: NID Number */}
          {scrollProgress >= 0.25 && (
            <mesh
              position={[0.3, 0.04, 0.4]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredHotspot(
                  packet === 'B'
                    ? 'NID: 269478513 (9 Digits - Invalid Format)'
                    : 'NID: 2694785130 (10 Digits Smart Card)'
                );
              }}
              onPointerOut={() => setHoveredHotspot(null)}
            >
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color={packet === 'B' ? '#d4a017' : '#27864a'} />
            </mesh>
          )}
        </group>

        {/* ── STAGE 02: OPTICAL SCANNING LASER BEAM ───────────────── */}
        <mesh ref={scanLine} position={[0, 0.52, 0]} visible={false}>
          <boxGeometry args={[9.4, 0.016, 0.035]} />
          <meshBasicMaterial color="#e8534a" transparent opacity={0.9} />
        </mesh>

        <mesh
          ref={scanGlow}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.515, 0]}
          visible={false}
        >
          <planeGeometry args={[9.4, 0.55]} />
          <meshBasicMaterial color="#c0392b" transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>

        {/* ── STAGE 03: CROSS-DOCUMENT AUDIT CORRELATION VECTORS ──── */}
        {/* Brass Matching Line (Khatian 1087) */}
        <lineSegments ref={matchLinesRef} geometry={matchPoints} visible={false}>
          <lineBasicMaterial color="#2d6a4f" linewidth={3} transparent opacity={0.88} />
        </lineSegments>

        {/* Vermillion Mismatch Line (Dag 412 vs Dag 421) */}
        <lineSegments ref={mismatchLineRef} geometry={mismatchPoints} visible={false}>
          <lineBasicMaterial color="#e8534a" linewidth={5} transparent opacity={0.95} />
        </lineSegments>

        {/* ── STAGE 04: STATUTORY VERDICT & RUBBER STAMP IMPACT ───── */}
        {/* High-Resolution Inked Stamp Imprint on paper stack */}
        <mesh
          ref={stampMark}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.448, 0.08]}
          visible={false}
        >
          <planeGeometry args={[1.85, 1.85]} />
          <meshBasicMaterial map={stampMarkTex} transparent opacity={0.96} />
        </mesh>

        {/* Solid Turned Brass & Mahogany Rubber Stamp */}
        <group ref={stampGroup} position={[0, 0.52, 0]} visible={false}>
          {/* Turned Mahogany Wooden Handle */}
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.38, 1.35, 32]} />
            <meshStandardMaterial color="#3d281a" roughness={0.35} />
          </mesh>
          {/* Brass Knob Ball */}
          <mesh position={[0, 1.78, 0]} castShadow>
            <sphereGeometry args={[0.32, 32, 32]} />
            <meshStandardMaterial color="#d4b483" roughness={0.2} metalness={0.92} />
          </mesh>
          {/* Heavy Brass Stamp Fitting Collar */}
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.45, 0.62, 0.14, 32]} />
            <meshStandardMaterial color="#b08d57" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Red / Green Rubber Die Base */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.72, 0.72, 0.24, 36]} />
            <meshStandardMaterial
              color={packet === 'A' ? '#27864a' : '#c0392b'}
              roughness={0.45}
              metalness={0.15}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
