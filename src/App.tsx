/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Brain, Info, RotateCcw, ZoomIn, ZoomOut, MousePointer2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Brain Data ---
const BRAIN_REGIONS = [
  {
    id: 'frontal',
    name: 'Frontal Lobe',
    description: 'The frontal lobe is the "control center" of your brain. It is responsible for executive functions like planning, decision-making, problem-solving, and controlling your emotions and personality.'
  },
  {
    id: 'parietal',
    name: 'Parietal Lobe',
    description: 'The parietal lobe processes sensory information from the outside world. It helps you understand spatial orientation, movement, and the sense of touch, including pressure, pain, and temperature.'
  },
  {
    id: 'temporal',
    name: 'Temporal Lobe',
    description: 'The temporal lobes are located near your ears. They are essential for processing auditory information (hearing) and are heavily involved in memory storage and language comprehension.'
  },
  {
    id: 'occipital',
    name: 'Occipital Lobe',
    description: 'Located at the very back of the brain, the occipital lobe is primarily responsible for visual processing. It interprets what your eyes see, including colors, shapes, and movement.'
  },
  {
    id: 'cerebellum',
    name: 'Cerebellum',
    description: 'The cerebellum, or "little brain," is located at the base of the skull. It coordinates voluntary movements such as posture, balance, coordination, and speech.'
  },
  {
    id: 'brainstem',
    name: 'Brainstem',
    description: 'The brainstem connects the brain to the spinal cord. It controls fundamental life-sustaining functions like breathing, heart rate, blood pressure, and sleep cycles.'
  }
];

// URLs to high-quality public brain models
const MODEL_URLS = [
  `https://cdn.jsdelivr.net/gh/pmndrs/market-assets@master/models/brain/model.glb?v=${Date.now()}`,
  `https://raw.githubusercontent.com/pmndrs/market-assets/master/models/brain/model.glb?v=${Date.now()}`,
  `https://unpkg.com/@pmndrs/market-assets@1.0.0/models/brain/model.glb?v=${Date.now()}`,
  `https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/brain/model.gltf?v=${Date.now()}`
];

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRegion, setSelectedRegion] = useState<typeof BRAIN_REGIONS[0] | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [useProcedural, setUseProcedural] = useState(false);
  const [useSketchfab, setUseSketchfab] = useState(true);
  const initializedRef = useRef(false);
  const sketchfabApiRef = useRef<any>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    brainModel?: THREE.Group;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    if (useSketchfab) {
      const iframe = document.createElement('iframe');
      iframe.id = 'sketchfab-viewer';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
      containerRef.current.appendChild(iframe);

      // @ts-ignore
      const client = new window.Sketchfab('1.12.1', iframe);
      client.init('24ec03412dd8432bb0d3e750a72608e0', {
        success: (api: any) => {
          sketchfabApiRef.current = api;
          api.start();
          api.addEventListener('viewerready', () => {
            setLoading(false);
            setError(null);
            console.log('Sketchfab Viewer Ready');
          });

          api.addEventListener('click', (info: any) => {
            if (info.instanceID) {
              // We don't know the node names, so we'll just show a general info
              // or try to guess based on position if possible.
              // For now, let's just let the user use the sidebar.
            }
          });
        },
        error: () => {
          setError('Failed to load the Sketchfab model. Please check your internet connection.');
          setLoading(false);
        },
        autostart: 1,
        transparent: 1,
        ui_controls: 0,
        ui_infos: 0,
        ui_watermark: 0,
        ui_stop: 0,
        ui_hint: 0,
        ui_ar: 0,
        ui_help: 0,
        ui_settings: 0,
        ui_vr: 0,
        ui_fullscreen: 0,
        ui_annotations: 0,
        dnt: 1
      });

      initializedRef.current = true;
      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    }

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(4, 2, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0x4ecdc4, 0.8);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0xffffff, 2);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // --- Helper Functions ---
    const createProceduralBrain = () => {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x4ecdc4, 
        roughness: 0.3, 
        metalness: 0.2,
        emissive: 0x10b981,
        emissiveIntensity: 0.2
      });
      
      const spheres = [
        { pos: [0, 0, 0.5], scale: [1, 0.8, 1.2] },
        { pos: [0, 0.2, -0.5], scale: [1.1, 0.9, 1.1] },
        { pos: [0.6, -0.1, 0], scale: [0.7, 0.7, 0.9] },
        { pos: [-0.6, -0.1, 0], scale: [0.7, 0.7, 0.9] },
        { pos: [0, -0.4, -0.8], scale: [0.8, 0.6, 0.7] },
        { pos: [0, -0.8, -0.3], scale: [0.3, 0.8, 0.3] },
      ];

      spheres.forEach(s => {
        const geo = new THREE.SphereGeometry(1, 32, 32);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
        mesh.scale.set(s.scale[0], s.scale[1], s.scale[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      });

      scene.add(group);
      if (sceneRef.current) sceneRef.current.brainModel = group;
      setLoading(false);
      setError(null);
    };

    const loadModel = (urlIndex: number) => {
      const manager = new THREE.LoadingManager();
      const loader = new GLTFLoader(manager);
      loader.setCrossOrigin('anonymous');
      
      const url = MODEL_URLS[urlIndex];
      
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(15, 15, 15);
          model.position.y = -0.5;
          
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                (mesh.material as THREE.MeshStandardMaterial).roughness = 0.4;
                (mesh.material as THREE.MeshStandardMaterial).metalness = 0.1;
              }
            }
          });

          scene.add(model);
          if (sceneRef.current) sceneRef.current.brainModel = model;
          setLoading(false);
          setError(null);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            setLoadProgress(Math.round(percentComplete));
          }
        },
        (err) => {
          console.error(`Error loading model from ${url}:`, err);
          if (urlIndex < MODEL_URLS.length - 1) {
            setTimeout(() => {
              setCurrentUrlIndex(urlIndex + 1);
              loadModel(urlIndex + 1);
            }, 1000);
          } else {
            setError('Failed to establish a neural link. All connection attempts failed. This usually happens when external assets are blocked by your network or browser.');
            setLoading(false);
          }
        }
      );
    };

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // --- Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (sceneRef.current?.brainModel) {
        const intersects = raycaster.intersectObject(sceneRef.current.brainModel, true);
        if (intersects.length > 0) {
          document.body.style.cursor = 'pointer';
          const point = intersects[0].point;
          if (point.z > 0.5) setHoveredRegion('frontal');
          else if (point.y < -0.5) setHoveredRegion('brainstem');
          else setHoveredRegion('parietal');
        } else {
          setHoveredRegion(null);
          document.body.style.cursor = 'default';
        }
      }
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      if (sceneRef.current?.brainModel) {
        const intersects = raycaster.intersectObject(sceneRef.current.brainModel, true);
        if (intersects.length > 0) {
          controls.autoRotate = false;
          const point = intersects[0].point;
          let regionId = 'frontal';
          if (point.z < -0.5) regionId = 'occipital';
          else if (point.y < -0.6) regionId = 'cerebellum';
          else if (point.y < -0.3 && Math.abs(point.x) > 0.5) regionId = 'temporal';
          else if (point.z < 0.2) regionId = 'parietal';
          
          const region = BRAIN_REGIONS.find(r => r.id === regionId);
          if (region) setSelectedRegion(region);
        } else {
          setSelectedRegion(null);
          controls.autoRotate = true;
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    sceneRef.current = { scene, camera, renderer, controls };
    initializedRef.current = true;

    // Initial load
    loadModel(0);

    // Expose procedural brain creation to the component scope via a ref if needed
    // But since we use a state to trigger it, we can just check it in a separate useEffect
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Separate effect for procedural fallback (not used in Sketchfab mode)
  useEffect(() => {
    if (!useSketchfab && useProcedural && sceneRef.current && !sceneRef.current.brainModel) {
      // We need to define createProceduralBrain in a way that it can be called here
      // Or just re-implement it here.
      const scene = sceneRef.current.scene;
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x4ecdc4, 
        roughness: 0.3, 
        metalness: 0.2,
        emissive: 0x10b981,
        emissiveIntensity: 0.2
      });
      
      const spheres = [
        { pos: [0, 0, 0.5], scale: [1, 0.8, 1.2] },
        { pos: [0, 0.2, -0.5], scale: [1.1, 0.9, 1.1] },
        { pos: [0.6, -0.1, 0], scale: [0.7, 0.7, 0.9] },
        { pos: [-0.6, -0.1, 0], scale: [0.7, 0.7, 0.9] },
        { pos: [0, -0.4, -0.8], scale: [0.8, 0.6, 0.7] },
        { pos: [0, -0.8, -0.3], scale: [0.3, 0.8, 0.3] },
      ];

      spheres.forEach(s => {
        const geo = new THREE.SphereGeometry(1, 32, 32);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
        mesh.scale.set(s.scale[0], s.scale[1], s.scale[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      });

      scene.add(group);
      sceneRef.current.brainModel = group;
      setLoading(false);
      setError(null);
    }
  }, [useProcedural]);


  const resetCamera = () => {
    if (sceneRef.current) {
      sceneRef.current.camera.position.set(4, 2, 6);
      sceneRef.current.controls.target.set(0, 0, 0);
      sceneRef.current.controls.autoRotate = true;
      sceneRef.current.controls.update();
      setSelectedRegion(null);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Loading Overlay */}
      <AnimatePresence>
        {(loading || error) && (
          <motion.div 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 text-center"
          >
            {error ? (
              <div className="max-w-md">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Info className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Neural Link Failed</h2>
                <p className="text-zinc-500 text-sm mb-6">{error}</p>
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 mb-8 text-left">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-3">Connection Log</p>
                  <div className="space-y-2">
                    {MODEL_URLS.map((url, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${i <= currentUrlIndex ? 'bg-red-500' : 'bg-zinc-800'}`} />
                        <span className="text-[8px] font-mono text-zinc-500 truncate max-w-[200px]">{url}</span>
                        <span className="text-[8px] font-bold uppercase text-zinc-700 ml-auto">{i < currentUrlIndex ? 'Failed' : i === currentUrlIndex ? 'Error' : 'Pending'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-white text-black font-black uppercase tracking-tighter rounded-full hover:bg-emerald-500 transition-colors"
                  >
                    Retry Connection
                  </button>
                  <button 
                    onClick={() => {
                      setUseSketchfab(false);
                      setUseProcedural(true);
                      window.location.reload();
                    }}
                    className="px-8 py-3 bg-zinc-900 text-white border border-white/10 font-black uppercase tracking-tighter rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    Force Load (Legacy)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mb-8">
                  <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-400">{useSketchfab ? '...' : `${loadProgress}%`}</span>
                  </div>
                </div>
                <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: useSketchfab ? '100%' : `${loadProgress}%` }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
                <p className="text-zinc-400 animate-pulse font-bold tracking-widest uppercase text-[10px] mb-2">
                  {useSketchfab ? 'Connecting to Sketchfab Node...' : 'Initializing Neural Network...'}
                </p>
                {!useSketchfab && (
                  <p className="text-zinc-600 font-mono text-[8px] uppercase tracking-widest">Attempt {currentUrlIndex + 1} of {MODEL_URLS.length}</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <Brain className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">Cerebro<span className="text-emerald-500">3D</span></h1>
              <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Interactive Atlas</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <button 
            onClick={resetCamera}
            className="group flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/10 rounded-full transition-all"
          >
            <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider">Reset</span>
          </button>
        </div>
      </header>

      {/* Region Selector Sidebar */}
      <div className="absolute top-32 left-8 z-10 flex flex-col gap-2 max-w-[200px]">
        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-2">Select Region</p>
        {BRAIN_REGIONS.map(region => (
          <button
            key={region.id}
            onClick={() => setSelectedRegion(region)}
            className={`px-4 py-2 text-left rounded-xl border transition-all ${
              selectedRegion?.id === region.id 
                ? 'bg-emerald-500 border-emerald-500 text-black' 
                : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/10'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-tighter">{region.name}</span>
          </button>
        ))}
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Hover Label */}
      <AnimatePresence>
        {hoveredRegion && !selectedRegion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="px-6 py-3 bg-emerald-500 text-black font-black uppercase tracking-tighter rounded-full shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              {BRAIN_REGIONS.find(r => r.id === hoveredRegion)?.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Panel */}
      <AnimatePresence>
        {selectedRegion && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full max-w-lg z-20 p-8 pointer-events-none"
          >
            <div className="h-full w-full bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 pointer-events-auto shadow-2xl flex flex-col">
              <button 
                onClick={() => setSelectedRegion(null)}
                className="self-end p-3 hover:bg-white/10 rounded-full transition-colors mb-8"
              >
                <ZoomOut className="w-6 h-6 text-zinc-400" />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                <div className="mb-10">
                  <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 border border-emerald-500/20">
                    Selected Region
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase mb-6">{selectedRegion.name}</h2>
                  <div className="h-1 w-20 bg-emerald-500 rounded-full" />
                </div>

                <div className="space-y-12">
                  <section>
                    <div className="flex items-center gap-3 text-zinc-400 mb-4">
                      <Info className="w-5 h-5" />
                      <h3 className="text-xs font-bold uppercase tracking-widest">Description</h3>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xl font-medium">
                      {selectedRegion.description}
                    </p>
                  </section>

                  <section className="p-8 bg-white/5 rounded-[32px] border border-white/5">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6">Biological Functions</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {['Cognitive Processing', 'Neural Integration', 'Signal Transduction'].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform" />
                          <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{item}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Cerebro Atlas v2.0</p>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-emerald-500/30" />)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="flex gap-8 px-8 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <MousePointer2 className="w-3 h-3 text-emerald-500" />
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <ZoomIn className="w-3 h-3 text-emerald-500" />
            <span>Zoom</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <RotateCcw className="w-3 h-3 text-emerald-500" />
            <span>Rotate</span>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
