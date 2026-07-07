// ==========================================================================
// THREE.JS AUTOMOTIVE 3D BACKGROUND
// ==========================================================================

let scene, camera, renderer;
let carGroup;
let carModel;
let gltfWheels = [];
let carParticles, wheelParticles = [];
let airflowParticles;
let mouseX = 0, mouseY = 0;
let targetMouseX = 0, targetMouseY = 0;
let lastDeform = -1;

// Scroll state management
let scrollPercent = 0;
let entranceActive = true;
let currentStates = {
    posX: 0, posY: -0.15, posZ: -15, // Start far back for entrance
    rotX: 0.1, rotY: -0.6 - Math.PI * 2, // Start 360 degrees back for spin
    rotZ: 0,
    scale: 1.25,
    airflowOpacity: 0,
    crashDeformation: 0
};

// Lerp utility
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// Initialize Three.js
function initThree() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050507, 0.15);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 4.2;

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050507, 0);
    container.appendChild(renderer.domElement);

    // 4. Car Group
    carGroup = new THREE.Group();
    scene.add(carGroup);

    // 5. Load 3D GLB Car Model
    loadCarModel();

    // 6. Generate Airflow Streamlines (for CFD section)
    createAirflowStreamlines();

    // 7. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.6);
    scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0x00D1FF, 1.5);
    directionalLight.position.set(5, 8, 5);
    scene.add(directionalLight);

    const whiteKeyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    whiteKeyLight.position.set(-5, 5, -5);
    scene.add(whiteKeyLight);

    const redLight = new THREE.DirectionalLight(0xff3b3b, 0.5);
    redLight.position.set(-2, 2, -6);
    scene.add(redLight);

    // 8. Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll);

    // Start animation loop
    animate();
}

// ==========================================================================
// PROCEDURAL 3D WIREFRAME CAR GENERATION
// ==========================================================================
function createProceduralCar() {
    const carColor = new THREE.Color(0x00D1FF); // Electric Cyan
    const positions = [];
    const colors = [];
    const originalPositions = []; // Store for deformation/crash simulations

    // Helper: Add points along a 3D curve
    function addCurvePoints(pointsArray, density = 60) {
        const curve = new THREE.CatmullRomCurve3(pointsArray);
        const sampledPoints = curve.getPoints(density);
        
        sampledPoints.forEach(p => {
            positions.push(p.x, p.y, p.z);
            originalPositions.push(p.x, p.y, p.z);
            
            // Default color: Cyan
            colors.push(carColor.r, carColor.g, carColor.b);
        });
    }

    // --- CAR BODY SILHOUETTES ---
    
    // 1. Center Spine (Hood -> Windshield -> Roof -> Spoiler)
    addCurvePoints([
        new THREE.Vector3(0, -0.4, 2.2),   // Front nose
        new THREE.Vector3(0, -0.25, 1.7),  // Hood
        new THREE.Vector3(0, 0.15, 0.9),   // Windshield base
        new THREE.Vector3(0, 0.45, 0.0),   // Roof peak
        new THREE.Vector3(0, 0.25, -0.9),  // Rear glass
        new THREE.Vector3(0, -0.05, -1.8), // Rear deck
        new THREE.Vector3(0, 0.1, -2.1)    // Active spoiler
    ], 80);

    // 2. Left & Right Shoulder/Window Lines
    [1, -1].forEach(side => {
        addCurvePoints([
            new THREE.Vector3(0.2 * side, -0.4, 2.25),
            new THREE.Vector3(0.5 * side, -0.25, 1.65),
            new THREE.Vector3(0.8 * side, 0.1, 0.8),    // A-Pillar base
            new THREE.Vector3(0.75 * side, 0.42, 0.05),  // Roof side
            new THREE.Vector3(0.8 * side, 0.15, -0.85),  // C-Pillar base
            new THREE.Vector3(0.75 * side, -0.08, -1.75),
            new THREE.Vector3(0.3 * side, -0.1, -2.1)
        ], 80);
    });

    // 3. Left & Right Waist/Fender Outlines (Wheel arches & side skirts)
    [1, -1].forEach(side => {
        addCurvePoints([
            new THREE.Vector3(0.4 * side, -0.4, 2.2),     // Front bumper center
            new THREE.Vector3(0.95 * side, -0.4, 1.8),    // Front bumper corner
            // Front Wheel Arch (around z = 1.3)
            new THREE.Vector3(0.95 * side, -0.4, 1.55),
            new THREE.Vector3(0.98 * side, 0.0, 1.3),
            new THREE.Vector3(0.95 * side, -0.4, 1.05),
            // Side Skirt
            new THREE.Vector3(0.92 * side, -0.42, 0.0),
            // Rear Wheel Arch (around z = -1.3)
            new THREE.Vector3(0.95 * side, -0.4, -1.05),
            new THREE.Vector3(1.02 * side, 0.05, -1.3),
            new THREE.Vector3(0.95 * side, -0.4, -1.55),
            // Rear Bumper
            new THREE.Vector3(0.9 * side, -0.38, -2.0),
            new THREE.Vector3(0.5 * side, -0.38, -2.15),
            new THREE.Vector3(0, -0.38, -2.2)
        ], 120);
    });

    // 4. Longitudinal Panels (Hood & Side Panels)
    for (let i = 1; i <= 4; i++) {
        const offset = i * 0.22;
        // Left & Right hood lines
        [1, -1].forEach(side => {
            addCurvePoints([
                new THREE.Vector3(0.1 * side, -0.4, 2.2),
                new THREE.Vector3(offset * side, -0.28, 1.7),
                new THREE.Vector3(offset * 1.1 * side, 0.12, 0.85)
            ], 40);
        });
    }

    // 5. Rear Venturi / Diffuser tunnels
    [0.2, 0.5, 0.8].forEach(xOffset => {
        [1, -1].forEach(side => {
            addCurvePoints([
                new THREE.Vector3(xOffset * side, -0.42, -0.8),
                new THREE.Vector3(xOffset * 0.95 * side, -0.28, -1.6),
                new THREE.Vector3(xOffset * 0.9 * side, -0.15, -2.1)
            ], 40);
        });
    });

    // --- PACKAGING & GEOMETRY CREATION ---
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Material: Glowing Cyan Circles
    const material = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    carParticles = new THREE.Points(geometry, material);
    carParticles.userData = { originalPositions }; // Cache for morphing/crash physics
    carGroup.add(carParticles);

    // --- WHEELS (4 Cylinders) ---
    const wheelPositions = [
        { x: 0.9, y: -0.4, z: 1.3 },   // FL
        { x: -0.9, y: -0.4, z: 1.3 },  // FR
        { x: 0.92, y: -0.4, z: -1.3 },  // RL
        { x: -0.92, y: -0.4, z: -1.3 } // RR
    ];

    const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16, 3, true);
    // Rotate cylinder geometry to align horizontally with axles
    wheelGeom.rotateZ(Math.PI / 2);

    const wheelMat = new THREE.PointsMaterial({
        color: 0x00D1FF,
        size: 0.035,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Points(wheelGeom, wheelMat);
        wheel.position.set(pos.x, pos.y, pos.z);
        carGroup.add(wheel);
        wheelParticles.push(wheel);
    });
}

// ==========================================================================
// GLTF MODEL LOADING & STYLING
// ==========================================================================
function loadCarModel() {
    try {
        if (typeof THREE.GLTFLoader === 'undefined') {
            throw new Error('THREE.GLTFLoader is not defined (likely offline or CDN failed)');
        }

        const loader = new THREE.GLTFLoader();
        
        loader.load(
            'assets/models/Mclaren_f1.glb',
            function (gltf) {
                carModel = gltf.scene;
                
                // 1. Center and scale the model using a bounding box
                const box = new THREE.Box3().setFromObject(carModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                // Center the model relative to its group
                carModel.position.x -= center.x;
                carModel.position.y -= center.y;
                carModel.position.z -= center.z;
                
                // Scale the model to a standardized bounding size (length of 3.8 units)
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 3.8 / maxDim;
                carModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // 2. Material Styling (Wireframe Mode for engineering aesthetic)
                const bodyMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00d1ff,      // Cyan wireframe
                    metalness: 0.5,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.4,
                    wireframe: true
                });
                
                const glassMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00d1ff,      // Cyan wireframe glass
                    metalness: 0.9,
                    roughness: 0.1,
                    transparent: true,
                    opacity: 0.15,
                    wireframe: true
                });
                
                const wheelMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00d1ff,      // Cyan wireframe wheels
                    metalness: 0.6,
                    roughness: 0.4,
                    transparent: true,
                    opacity: 0.3,
                    wireframe: true
                });
                
                carModel.traverse((child) => {
                    if (child.isMesh) {
                        const name = child.name.toLowerCase();
                        const matName = child.material && child.material.name ? child.material.name.toLowerCase() : '';
                        
                        // Assign materials based on mesh names or material names
                        if (name.includes('glass') || name.includes('window') || name.includes('windshield') || matName.includes('glass')) {
                            child.material = glassMaterial;
                        } else if (name.includes('wheel') || name.includes('rim') || name.includes('tire') || name.includes('tyre') || name.includes('hub') || matName.includes('wheel') || matName.includes('rim') || matName.includes('tire')) {
                            child.material = wheelMaterial;
                        } else if (name.includes('light') || name.includes('lens') || matName.includes('light')) {
                            if (child.material) {
                                child.material.emissive = new THREE.Color(name.includes('rear') || name.includes('tail') ? 0xff0000 : 0xffffff);
                                child.material.emissiveIntensity = 1.0;
                            }
                        } else {
                            child.material = bodyMaterial;
                        }
                        
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Store original positions for CPU deformation
                        const position = child.geometry.attributes.position;
                        if (position) {
                            child.userData.originalPositions = position.array.slice();
                        }
                    }
                    
                    // Identify wheels for rotation
                    const nodeName = child.name.toLowerCase();
                    if (nodeName.includes('wheel') || nodeName.includes('rim') || nodeName.includes('tire') || nodeName.includes('tyre')) {
                        // Avoid double-adding child meshes if their parent is already added
                        let hasWheelParent = false;
                        let parent = child.parent;
                        while (parent && parent !== carModel) {
                            if (parent.name.toLowerCase().includes('wheel') || parent.name.toLowerCase().includes('rim') || parent.name.toLowerCase().includes('tire') || parent.name.toLowerCase().includes('tyre')) {
                                hasWheelParent = true;
                                break;
                            }
                            parent = parent.parent;
                        }
                        if (!hasWheelParent) {
                            gltfWheels.push(child);
                        }
                    }
                });
                
                // Rotate the base model 180 degrees so the front faces forward
                carModel.rotation.y = Math.PI;

                carGroup.add(carModel);
                
                // Dispatch event to hide preloader and trigger animations
                window.isBootComplete = true;

                // Check if page was loaded scrolled down to skip entrance animations
                const isScrolledDown = (window.scrollY || document.documentElement.scrollTop) > 50;
                if (isScrolledDown) {
                    entranceActive = false;
                    onScroll(); // Calculate initial scrollPercent
                    const target = getScrollTargets();
                    currentStates.posX = target.posX;
                    currentStates.posY = target.posY;
                    currentStates.posZ = target.posZ;
                    currentStates.rotX = target.rotX;
                    currentStates.rotY = target.rotY;
                    currentStates.rotZ = target.rotZ;
                    currentStates.scale = target.scale;
                    currentStates.airflowOpacity = target.airflowOpacity;
                    currentStates.crashDeformation = target.crashDeformation;
                    
                    window.dispatchEvent(new Event('bootComplete'));
                } else {
                    // Trigger GSAP entrance animation: move forward, then spin 360
                    const isMobile = window.innerWidth <= 1024;
                    currentStates.posX = isMobile ? 0 : 0.8;
                    currentStates.scale = isMobile ? 0.8 : 1.25;

                    if (typeof gsap !== 'undefined') {
                        const tl = gsap.timeline({
                            onComplete: () => {
                                entranceActive = false;
                                currentStates.rotY = -0.6; // Align to starting scroll state
                                if (typeof ScrollTrigger !== 'undefined') {
                                    ScrollTrigger.refresh();
                                }
                            }
                        });

                        // 1. Move forward
                        tl.to(currentStates, {
                            posZ: 1.2, // Closer!
                            duration: 1.8,
                            ease: "power2.out"
                        });

                        // 2. Spin 360 degrees
                        tl.to(currentStates, {
                            rotY: -0.6,
                            duration: 2.2,
                            ease: "power2.inOut"
                        });
                    } else {
                        entranceActive = false;
                        currentStates.posZ = 1.2;
                        currentStates.rotY = -0.6;
                    }
                    window.dispatchEvent(new Event('bootComplete'));
                }
            },
            // Progress
            function (xhr) {
                if (xhr.total > 0) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    const loaderPerc = document.getElementById('loader-perc');
                    const loaderProg = document.getElementById('loader-prog');
                    if (loaderPerc) loaderPerc.textContent = percent.toString().padStart(2, '0');
                    if (loaderProg) loaderProg.style.width = `${percent}%`;
                }
            },
            // Error
            function (error) {
                console.error('An error occurred loading the GLB model:', error);
                // Fallback to procedural car
                createProceduralCar();
                window.isBootComplete = true;
                window.dispatchEvent(new Event('bootComplete'));
            }
        );
    } catch (e) {
        console.error('GLTFLoader failed, falling back to procedural car:', e);
        createProceduralCar();
        window.isBootComplete = true;
        window.dispatchEvent(new Event('bootComplete'));
    }
}

// ==========================================================================
// LIFT / DRAG COEFFICIENT STREAMLINES
// ==========================================================================
function createAirflowStreamlines() {
    const streamCount = 25;
    const pointsPerStream = 40;
    const positions = [];
    const streamData = [];

    for (let i = 0; i < streamCount; i++) {
        const x = (Math.random() - 0.5) * 2.8;
        const y = (Math.random() - 0.5) * 1.2 + 0.1;
        const z = Math.random() * 5 + 3;

        streamData.push({
            startX: x,
            startY: y,
            startZ: z,
            currentZ: z,
            speed: 0.12 + Math.random() * 0.06
        });

        for (let j = 0; j < pointsPerStream; j++) {
            positions.push(x, y, z - (j * 0.15));
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x00FFBB,
        size: 0.015,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    airflowParticles = new THREE.Points(geometry, material);
    airflowParticles.userData = { streamData, pointsPerStream };
    scene.add(airflowParticles);
}

function updateAirflow() {
    if (!airflowParticles || currentStates.airflowOpacity <= 0.01) return;

    const posAttr = airflowParticles.geometry.attributes.position;
    const { streamData, pointsPerStream } = airflowParticles.userData;

    airflowParticles.material.opacity = currentStates.airflowOpacity * 0.2;

    for (let i = 0; i < streamData.length; i++) {
        const data = streamData[i];
        data.currentZ -= data.speed;

        if (data.currentZ < -4) {
            data.currentZ = 4 + Math.random() * 2;
        }

        const streamStartIndex = i * pointsPerStream;
        
        for (let j = pointsPerStream - 1; j > 0; j--) {
            const idx = (streamStartIndex + j) * 3;
            const prevIdx = (streamStartIndex + j - 1) * 3;
            posAttr.array[idx] = posAttr.array[prevIdx];
            posAttr.array[idx + 1] = posAttr.array[prevIdx + 1];
            posAttr.array[idx + 2] = posAttr.array[prevIdx + 2];
        }

        const leadIdx = streamStartIndex * 3;
        let x = data.startX;
        let y = data.startY;
        let z = data.currentZ;

        if (z > -2 && z < 2) {
            if (y < 0.6 && Math.abs(x) < 1.0) {
                const heightFactor = Math.max(0, 1.6 - Math.abs(z - 0.2));
                y += heightFactor * 0.12;
            }
            if (Math.abs(x) < 1.1) {
                const widthFactor = Math.max(0, 1.2 - Math.abs(z - 1.2));
                x += (x > 0 ? 1 : -1) * widthFactor * 0.08;
            }
        }

        posAttr.array[leadIdx] = x;
        posAttr.array[leadIdx + 1] = y;
        posAttr.array[leadIdx + 2] = z;
    }

    posAttr.needsUpdate = true;
}

// ==========================================================================
// CRASH DEFORMATION PHYSICS
// ==========================================================================
function updateCrashSimulation() {
    const deform = currentStates.crashDeformation;
    if (deform === lastDeform) return;
    lastDeform = deform;

    // 1. GLTF Model Deformation
    if (carModel) {
        carModel.traverse((child) => {
            if (child.isMesh) {
                const geom = child.geometry;
                const posAttr = geom.attributes.position;
                const origPos = child.userData.originalPositions;
                if (!posAttr || !origPos) return;

                for (let i = 0; i < posAttr.count; i++) {
                    const i3 = i * 3;
                    const origX = origPos[i3];
                    const origY = origPos[i3 + 1];
                    const origZ = origPos[i3 + 2];

                    // Deform vertices at the front of the car (local Z > 0.5)
                    if (origZ > 0.5 && deform > 0.01) {
                        const crashFactor = (origZ - 0.5) / 1.5;
                        posAttr.array[i3 + 2] = origZ - (deform * 0.35 * crashFactor);
                        posAttr.array[i3] = origX + (Math.sin(origZ * 25) * deform * 0.06 * crashFactor);
                        posAttr.array[i3 + 1] = origY + (Math.cos(origX * 25) * deform * 0.04 * crashFactor);
                    } else {
                        posAttr.array[i3] = origX;
                        posAttr.array[i3 + 1] = origY;
                        posAttr.array[i3 + 2] = origZ;
                    }
                }
                posAttr.needsUpdate = true;
                geom.computeVertexNormals(); // Recompute normals so shading updates realistically
            }
        });
    }

    // 2. Fallback Procedural Car Deformation
    if (carParticles) {
        const posAttr = carParticles.geometry.attributes.position;
        const colorAttr = carParticles.geometry.attributes.color;
        const originalPositions = carParticles.userData.originalPositions;

        const red = new THREE.Color(0xFF3B3B);
        const yellow = new THREE.Color(0xFFD100);
        const cyan = new THREE.Color(0x00D1FF);

        for (let i = 0; i < posAttr.count; i++) {
            const i3 = i * 3;
            const origX = originalPositions[i3];
            const origY = originalPositions[i3 + 1];
            const origZ = originalPositions[i3 + 2];

            if (origZ > 0.8 && deform > 0.01) {
                const crashFactor = (origZ - 0.8) / 1.4;
                
                posAttr.array[i3 + 2] = origZ - (deform * 0.45 * crashFactor);
                posAttr.array[i3] = origX + (Math.sin(origZ * 10) * deform * 0.08 * crashFactor);
                posAttr.array[i3 + 1] = origY + (Math.cos(origX * 10) * deform * 0.05 * crashFactor);

                let vertexColor = cyan.clone();
                if (deform > 0.1) {
                    const stress = crashFactor * deform;
                    if (stress > 0.6) {
                        vertexColor.lerp(red, (stress - 0.6) / 0.4);
                    } else {
                        vertexColor.lerp(yellow, stress / 0.6);
                    }
                }
                colorAttr.array[i3] = vertexColor.r;
                colorAttr.array[i3 + 1] = vertexColor.g;
                colorAttr.array[i3 + 2] = vertexColor.b;
            } else {
                posAttr.array[i3] = origX;
                posAttr.array[i3 + 1] = origY;
                posAttr.array[i3 + 2] = origZ;

                colorAttr.array[i3] = cyan.r;
                colorAttr.array[i3 + 1] = cyan.g;
                colorAttr.array[i3 + 2] = cyan.b;
            }
        }

        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
    }
}

// ==========================================================================
// SCROLL HANDLING
// ==========================================================================
function onScroll() {
    const h = document.documentElement;
    const b = document.body;
    const st = 'scrollTop';
    const sh = 'scrollHeight';
    
    scrollPercent = (h[st] || b[st]) / ((h[sh] || b[sh]) - window.innerHeight);
    if (isNaN(scrollPercent)) scrollPercent = 0;
}

function getScrollTargets() {
    let target = {
        posX: 0, posY: -0.2, posZ: 1.0,
        rotX: 0.1, rotY: -0.6, rotZ: 0,
        scale: 1.2,
        airflowOpacity: 0,
        crashDeformation: 0
    };

    const isMobile = window.innerWidth <= 1024;

    if (scrollPercent <= 0.15) {
        target.posX = isMobile ? 0 : 0.8; // Align slightly to the right to frame hero text
        target.posY = -0.15;
        target.posZ = 1.2; // Closer!
        target.rotX = 0.1;
        target.rotY = -0.6 + (scrollPercent * 1.5);
        target.scale = isMobile ? 0.8 : 1.25;
    } 
    else if (scrollPercent > 0.15 && scrollPercent <= 0.38) {
        target.posX = isMobile ? 0 : 1.25;
        target.posY = isMobile ? -1.0 : -0.15;
        target.posZ = 1.0; // Closer!
        target.rotX = 0.05;
        target.rotY = -1.57; // Side profile
        target.scale = isMobile ? 0.65 : 0.95;
    } 
    else if (scrollPercent > 0.38 && scrollPercent <= 0.58) {
        target.posX = isMobile ? 0 : -1.2;
        target.posY = isMobile ? -0.8 : 0.1;
        target.posZ = 1.0; // Closer!
        target.rotX = 1.1; // Top-down
        target.rotY = -0.4;
        target.scale = isMobile ? 0.6 : 0.9;
    } 
    else if (scrollPercent > 0.58 && scrollPercent <= 0.73) {
        target.posX = isMobile ? 0 : 1.0;
        target.posY = isMobile ? -0.8 : -0.15;
        target.posZ = 1.0; // Closer!
        target.rotX = 0.0;
        target.rotY = -1.57; // Side profile for CFD
        target.scale = isMobile ? 0.65 : 0.95;
        target.airflowOpacity = 1.0;
    } 
    else if (scrollPercent > 0.73 && scrollPercent <= 0.86) {
        target.posX = isMobile ? 0 : -0.9;
        target.posY = isMobile ? -0.8 : -0.2;
        target.posZ = 1.0; // Closer!
        target.rotX = 0.15;
        target.rotY = -0.45; // Front angle for crash
        target.scale = isMobile ? 0.7 : 1.0;
        target.crashDeformation = 1.0;
    } 
    else {
        target.posX = 0;
        target.posY = isMobile ? -0.8 : -0.3;
        target.posZ = 1.0; // Closer!
        target.rotX = 0.1;
        target.rotY = 1.0;
        target.scale = isMobile ? 0.6 : 0.85;
    }
    return target;
}

function updateScrollTransformations() {
    if (entranceActive) {
        // During entrance, apply GSAP values directly with gentle mouse look
        carGroup.position.set(currentStates.posX, currentStates.posY, currentStates.posZ);
        carGroup.rotation.x = currentStates.rotX + (mouseY * 0.08);
        carGroup.rotation.y = currentStates.rotY + (mouseX * 0.08);
        carGroup.rotation.z = currentStates.rotZ;
        carGroup.scale.set(currentStates.scale, currentStates.scale, currentStates.scale);
        return;
    }

    let target = getScrollTargets();

    const lerpSpeed = 0.06;
    currentStates.posX = lerp(currentStates.posX, target.posX, lerpSpeed);
    currentStates.posY = lerp(currentStates.posY, target.posY, lerpSpeed);
    currentStates.posZ = lerp(currentStates.posZ, target.posZ, lerpSpeed);
    
    currentStates.rotX = lerp(currentStates.rotX, target.rotX, lerpSpeed);
    currentStates.rotY = lerp(currentStates.rotY, target.rotY, lerpSpeed);
    currentStates.rotZ = lerp(currentStates.rotZ, target.rotZ, lerpSpeed);
    
    currentStates.scale = lerp(currentStates.scale, target.scale, lerpSpeed);
    currentStates.airflowOpacity = lerp(currentStates.airflowOpacity, target.airflowOpacity, lerpSpeed);
    currentStates.crashDeformation = lerp(currentStates.crashDeformation, target.crashDeformation, lerpSpeed);

    carGroup.position.set(currentStates.posX, currentStates.posY, currentStates.posZ);
    
    carGroup.rotation.x = currentStates.rotX + (mouseY * 0.12);
    carGroup.rotation.y = currentStates.rotY + (mouseX * 0.12);
    carGroup.rotation.z = currentStates.rotZ;
    
    carGroup.scale.set(currentStates.scale, currentStates.scale, currentStates.scale);
}

function onMouseMove(event) {
    targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    mouseX = lerp(mouseX, targetMouseX, 0.05);
    mouseY = lerp(mouseY, targetMouseY, 0.05);

    // Spin GLTF wheels if loaded (reversed to match forward direction)
    gltfWheels.forEach(wheel => {
        wheel.rotation.x -= 0.06;
    });

    wheelParticles.forEach(wheel => {
        wheel.rotation.x -= 0.04;
    });

    updateScrollTransformations();
    updateAirflow();
    updateCrashSimulation();

    renderer.render(scene, camera);
}

// Start Three.js immediately
initThree();
