/**
 * Shahnoza Raxmonberdiyeva — 3D Space Experience Engine
 * Photorealistic Three.js Planets • Atmospheric Shaders • Scroll Waypoints • Audio Synthesizer
 * Cyber Interactivity • Raycasting • Physics Inertia • Uzbek Cultural Astronomy Beacon
 */

(function () {
  'use strict';

  let WAYPOINTS = [];
  let scene, camera, renderer;
  let celestialBodies = [];
  let interactableObjects = [];
  let earthGroup, earthMesh, cloudsMesh, atmosphereMesh, uzbekistanBeaconGroup;
  let heroMoonMesh;
  let marsMesh, jupiterMesh, saturnGroup, saturnMesh, neptuneMesh, footerMoonMesh;
  let sunFlareSprite, cameraLight;
  let starField;

  let currentCamPos, targetCamPos, currentLookAt, targetLookAt;
  let currentWaypointIndex = 0;
  let zoomLevel = 1.0;
  let autoOrbit = true;

  // Raycaster & Interaction
  const raycaster = new THREE.Raycaster();
  const mousePointer = new THREE.Vector2();
  let hoveredObject = null;

  // Physics Drag Inertia
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isDragging = false;
  let previousPointerPos = { x: 0, y: 0 };
  let spinVelocityX = 0;
  let spinVelocityY = 0;

  // Audio Synthesizer
  let audioCtx = null;
  let isAudioMuted = true;
  let ambientOsc1, ambientOsc2, ambientFilter, ambientGain;

  // Planet Dossier Data
  const PLANET_DATA = {
    earth: {
      name: "Earth (Sol III) — Cradle of Civilizations",
      badge: "HOMELAND • UZBEKISTAN CORE",
      meta: "Coordinates: 40.0° N, 68.0° E [Jizzakh & Samarkand] • Radius: 6,371 km",
      desc: "Home planet of Shahnoza Raxmonberdiyeva. Central Asia and Uzbekistan stand as the historic epicenter of Islamic Golden Age astronomy and medicine — from Mirzo Ulugh Beg's observatory in Samarkand that mapped 1,018 stars to Abu Ali Ibn Sina (Avicenna) of Bukhara, the father of modern medicine."
    },
    mars: {
      name: "Mars (Sol IV) — The Red Frontier",
      badge: "ACADEMIC AMBITION & EDUCATION",
      meta: "Orbital Distance: 1.524 AU • Gravity: 0.38g • Radius: 3,389 km",
      desc: "Symbol of tireless intellectual exploration and ambition. Mirroring Shahnoza's academic milestones at Rustam Bosimov International School (GPA 5.0) and Gulistan Secondary School, and her dedication to biological and clinical sciences."
    },
    jupiter: {
      name: "Jupiter (Sol V) — The Great Sovereign",
      badge: "LEADERSHIP & GRAND INITIATIVES",
      meta: "Mass: 317.8 Earths • Great Red Spot Storm • Radius: 69,911 km",
      desc: "Massive scale and gravitational leadership. Represents Shahnoza's high-impact social initiatives: founding the Student Union, hosting the Olympiad for young children, and delivering televised medical addresses to 300+ audiences on Mahalla TV."
    },
    saturn: {
      name: "Saturn (Sol VI) — Rings of Harmony",
      badge: "EXTRACURRICULAR CONSTELLATION",
      meta: "Ring System Span: 282,000 km • Inclination: 26.7° • Radius: 58,232 km",
      desc: "Like Saturn's rings woven of countless orbits, Shahnoza co-founded 6 interconnected student clubs spanning Medicine, 3D Media, Booklovers, Debate, Chess, and Public Speaking, honoring the mathematical symmetry pioneered by Al-Khwarizmi."
    },
    neptune: {
      name: "Neptune (Sol VIII) — Azure Horizon",
      badge: "LANGUAGES & MULTIDISCIPLINARY TALENTS",
      meta: "Wind Speeds: 2,100 km/h • Mantle: Methane & Water Ice • Radius: 24,622 km",
      desc: "Deep celestial azure reflecting linguistic eloquence and cognitive mastery. Celebrating Native Uzbek literature (1st Place District Laureate), B2 National English Certificate, mental arithmetic championship, and musical arts (piano & violin)."
    },
    moon: {
      name: "The Moon (Luna I) — Orbital Outpost",
      badge: "TRANSMISSION TERMINAL & LORE",
      meta: "Orbital Radius: 384,400 km • Named Craters: Ulugh Beg & Ibn Sina",
      desc: "The lunar surface holds international craters named 'Ulugh Beigh' and 'Avicenna' honoring Uzbekistan's supreme astronomer and physician. The gateway for direct messages, transmissions, and future global collaborations."
    },
    beacon: {
      name: "Uzbekistan Beacon — Jizzakh & Samarkand",
      badge: "ASTRONOMICAL & MEDICAL RENAISSANCE",
      meta: "Latitude: 40° N • Longitude: 68° E • Silk Road Heart",
      desc: "Welcome to the heartland of Central Asian genius. The birthplace of algebra (Al-Khwarizmi), medicine (Ibn Sina), and precision star catalogues (Mirzo Ulugh Beg). Shahnoza carries this legacy forward into contemporary health sciences and youth leadership."
    }
  };

  function launch() {
    if (typeof THREE === 'undefined') {
      setTimeout(launch, 50);
      return;
    }
    setupWaypointsAndVectors();
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launch);
  } else {
    launch();
  }

  function setupWaypointsAndVectors() {
    WAYPOINTS = [
      {
        id: 'hero',
        name: 'Earth (Sol III) — Uzbekistan Core',
        alt: '408 km',
        velocity: '7.66 km/s',
        coords: '40.0° N, 68.0° E [Jizzakh & Samarkand]',
        camPos: new THREE.Vector3(0.0, 0.0, 10.0),
        lookAt: new THREE.Vector3(0.5, 0.0, 0.0),
        bodyIndex: 0
      },
      {
        id: 'education',
        name: 'Mars (Sol IV) — Red Frontier',
        alt: '1,420 km',
        velocity: '4.68 km/s',
        coords: '18.4° N, 226.0° E [Olympus Mons]',
        camPos: new THREE.Vector3(13.0, 3.2, -26.0),
        lookAt: new THREE.Vector3(18.0, 3.0, -35.0),
        bodyIndex: 1
      },
      {
        id: 'initiatives',
        name: 'Jupiter (Sol V) — Leadership Giant',
        alt: '42,800 km',
        velocity: '13.07 km/s',
        coords: '22.1° S, 114.8° W [Great Red Spot]',
        camPos: new THREE.Vector3(-15.0, 4.5, -55.0),
        lookAt: new THREE.Vector3(-25.0, 4.0, -75.0),
        bodyIndex: 2
      },
      {
        id: 'clubs',
        name: 'Saturn (Sol VI) — Golden Rings',
        alt: '35,600 km',
        velocity: '9.69 km/s',
        coords: 'Ring Plane Inclination: 26.7°',
        camPos: new THREE.Vector3(16.0, 0.0, -96.0),
        lookAt: new THREE.Vector3(25.0, -3.0, -115.0),
        bodyIndex: 3
      },
      {
        id: 'skills',
        name: 'Neptune (Sol VIII) — Azure Mantle',
        alt: '18,200 km',
        velocity: '5.43 km/s',
        coords: 'Deep Azure Mantle [Triton Horizon]',
        camPos: new THREE.Vector3(-10.0, -2.5, -138.0),
        lookAt: new THREE.Vector3(-18.0, -4.0, -155.0),
        bodyIndex: 4
      },
      {
        id: 'contact',
        name: 'The Moon (Luna I) — Ulugh Beg Outpost',
        alt: '112 km',
        velocity: '1.63 km/s',
        coords: '0.67° N, 23.47° E [Mare Tranquillitatis]',
        camPos: new THREE.Vector3(-1.5, 0.5, -190.0),
        lookAt: new THREE.Vector3(0.0, 0.0, -200.0),
        bodyIndex: 5
      }
    ];

    currentCamPos = new THREE.Vector3().copy(WAYPOINTS[0].camPos);
    targetCamPos = new THREE.Vector3().copy(WAYPOINTS[0].camPos);
    currentLookAt = new THREE.Vector3().copy(WAYPOINTS[0].lookAt);
    targetLookAt = new THREE.Vector3().copy(WAYPOINTS[0].lookAt);
  }

  function init() {
    const canvas = document.getElementById('webgl-canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.0006);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2500);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Check if opened via local file protocol
    if (window.location.protocol === 'file:') {
      const banner = document.getElementById('file-protocol-notice');
      if (banner) banner.style.display = 'flex';
    }

    setupLighting();
    setupCosmicBackground();
    buildCelestialSystem();
    setupEvents();
    setupDossierControls();

    updateScrollPosition();
    animate();
  }

  /* --------------------------------------------------------------------------
     Lighting & Sun Flare
     -------------------------------------------------------------------------- */
  function setupLighting() {
    const ambient = new THREE.AmbientLight(0x0a1428, 0.4);
    scene.add(ambient);

    // Primary Sun Light (illuminating Earth from top-left)
    const earthSunLight = new THREE.DirectionalLight(0xfff6e5, 1.9);
    earthSunLight.position.set(-16, 10, 7);
    earthSunLight.target.position.set(2.4, -2.2, 0.0);
    scene.add(earthSunLight);
    scene.add(earthSunLight.target);

    // Camera Key Light for travel
    cameraLight = new THREE.DirectionalLight(0xffffff, 0.65);
    cameraLight.position.set(0, 5, 10);
    scene.add(cameraLight);

    createSunFlare();
  }

  function createSunFlare() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.12, 'rgba(235, 248, 255, 0.95)');
    grad.addColorStop(0.28, 'rgba(56, 189, 248, 0.7)');
    grad.addColorStop(0.55, 'rgba(244, 63, 94, 0.3)');
    grad.addColorStop(1.0, 'rgba(3, 7, 18, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 8-Point Diffraction Spikes
    ctx.save();
    ctx.translate(256, 256);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 8; i++) {
      ctx.rotate((Math.PI * 2) / 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(250, 0);
      ctx.stroke();
    }
    ctx.restore();

    const flareTexture = new THREE.CanvasTexture(canvas);
    const flareMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    sunFlareSprite = new THREE.Sprite(flareMaterial);
    sunFlareSprite.position.set(-1.4, 1.35, 1.0);
    sunFlareSprite.scale.set(8.5, 8.5, 1.0);
    scene.add(sunFlareSprite);
  }

  /* --------------------------------------------------------------------------
     Cosmic Background & Starfield
     -------------------------------------------------------------------------- */
  function setupCosmicBackground() {
    const starsTex = loadResilientTexture('stars.jpg', '2k%20stars%20+%20milkyway.jpg', function(tex) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
    });

    const skyGeo = new THREE.SphereGeometry(1400, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: starsTex,
      side: THREE.BackSide,
      color: 0x94a3b8
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const r = THREE.MathUtils.randFloat(120, 950);
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = THREE.MathUtils.randFloat(0, Math.PI);

      starPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[idx + 2] = r * Math.cos(phi);

      const randColor = Math.random();
      if (randColor > 0.8) {
        starColors[idx] = 0.0;
        starColors[idx + 1] = 0.94;
        starColors[idx + 2] = 1.0; // Neon Cyan
      } else if (randColor > 0.65) {
        starColors[idx] = 1.0;
        starColors[idx + 1] = 0.16;
        starColors[idx + 2] = 0.52; // Neon Magenta/Pink
      } else {
        starColors[idx] = 0.96;
        starColors[idx + 1] = 0.98;
        starColors[idx + 2] = 1.0; // White
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true
    });

    starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
  }

  /* --------------------------------------------------------------------------
     Resilient Texture Loader
     -------------------------------------------------------------------------- */
  const CDN_BASE = 'https://raw.githubusercontent.com/Shriisoot/Planets-texture/master/';

  function loadResilientTexture(localFilename, cdnFilename, onLoaded) {
    const tex = new THREE.Texture();

    const candidates = [
      'assets/textures/' + localFilename,
      localFilename,
      localFilename.replace('.jpg', ' (2).jpg').replace('.png', ' (2).png'),
      CDN_BASE + (cdnFilename || localFilename)
    ];

    let candidateIndex = 0;

    function tryNext() {
      if (candidateIndex >= candidates.length) return;
      const url = candidates[candidateIndex++];
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        tex.image = img;
        tex.needsUpdate = true;
        if (onLoaded) onLoaded(tex);
      };

      img.onerror = () => {
        tryNext();
      };

      img.src = url;
    }

    tryNext();
    return tex;
  }

  /* --------------------------------------------------------------------------
     Build Celestial System & Interactive Objects
     -------------------------------------------------------------------------- */
  function buildCelestialSystem() {
    // 1. EARTH (Sol III) — Oriented to Uzbekistan & Central Asia
    earthGroup = new THREE.Group();
    earthGroup.position.set(2.4, -2.2, 0.0);
    earthGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
    // 202 degrees faces Uzbekistan and Central Asia directly toward the viewer
    earthGroup.rotation.y = THREE.MathUtils.degToRad(202);

    const earthRadius = 4.8;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);

    const earthDayTex = loadResilientTexture('earth_day.jpg', '8k_earth_daymap.jpg');
    const earthNightTex = loadResilientTexture('earth_night.jpg', '8k_earth_nightmap.jpg');

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthDayTex,
      emissive: new THREE.Color(0xffbe6b),
      emissiveMap: earthNightTex,
      emissiveIntensity: 0.75,
      roughness: 0.65,
      metalness: 0.05
    });

    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.userData = { id: 'earth', name: 'Earth (Sol III)' };
    earthGroup.add(earthMesh);
    interactableObjects.push(earthMesh);

    // Earth Clouds
    const cloudsTex = loadResilientTexture('earth_clouds.jpg', '2k_earth_clouds.jpg');
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.014, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthGroup.add(cloudsMesh);

    // Atmospheric Rayleigh Scattering Rim (Cyan Rim Glow)
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.032, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity * 2.2;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmosphereMesh);

    // 🌟 3D INTERACTIVE UZBEKISTAN BEACON (Lat 40° N, Lon 68° E)
    uzbekistanBeaconGroup = new THREE.Group();
    // Position on sphere surface for 40°N, 68°E
    uzbekistanBeaconGroup.position.set(1.377, 3.085, -3.409);
    uzbekistanBeaconGroup.lookAt(new THREE.Vector3(1.377 * 2, 3.085 * 2, -3.409 * 2));

    // Radar pulse ring
    const radarGeo = new THREE.RingGeometry(0.12, 0.22, 32);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const radarMesh = new THREE.Mesh(radarGeo, radarMat);
    uzbekistanBeaconGroup.add(radarMesh);

    // Glowing Neon Pin Cone
    const pinGeo = new THREE.ConeGeometry(0.12, 0.35, 16);
    pinGeo.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshBasicMaterial({
      color: 0xff2a85
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.userData = { id: 'beacon', name: 'Uzbekistan Beacon' };
    uzbekistanBeaconGroup.add(pinMesh);
    interactableObjects.push(pinMesh);

    // PointLight on beacon
    const beaconLight = new THREE.PointLight(0x00f0ff, 1.8, 3.5);
    uzbekistanBeaconGroup.add(beaconLight);

    earthGroup.add(uzbekistanBeaconGroup);

    scene.add(earthGroup);
    celestialBodies.push(earthGroup);

    // Hero Moon in upper-right cosmic sky
    const moonTex = loadResilientTexture('moon.jpg', '2k_moon.jpg');
    const heroMoonGeo = new THREE.SphereGeometry(1.35, 48, 48);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.9,
      metalness: 0.05
    });
    heroMoonMesh = new THREE.Mesh(heroMoonGeo, moonMat);
    heroMoonMesh.position.set(5.0, 1.8, -1.0);
    heroMoonMesh.rotation.y = THREE.MathUtils.degToRad(-40);
    heroMoonMesh.userData = { id: 'moon', name: 'The Moon (Luna I)' };
    scene.add(heroMoonMesh);
    interactableObjects.push(heroMoonMesh);

    // 2. MARS (Sol IV) — Education
    const marsRadius = 3.2;
    const marsGeo = new THREE.SphereGeometry(marsRadius, 48, 48);
    const marsTex = loadResilientTexture('mars.jpg', '8k_mars.jpg');
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.85,
      metalness: 0.08
    });
    marsMesh = new THREE.Mesh(marsGeo, marsMat);
    marsMesh.position.set(18.0, 3.0, -35.0);
    marsMesh.userData = { id: 'mars', name: 'Mars (Sol IV)' };
    scene.add(marsMesh);
    celestialBodies.push(marsMesh);
    interactableObjects.push(marsMesh);

    // 3. JUPITER (Sol V) — Initiatives
    const jupiterRadius = 8.0;
    const jupiterGeo = new THREE.SphereGeometry(jupiterRadius, 64, 64);
    const jupiterTex = loadResilientTexture('jupiter.jpg', '8k_jupiter.jpg');
    const jupiterMat = new THREE.MeshStandardMaterial({
      map: jupiterTex,
      roughness: 0.9,
      metalness: 0.05
    });
    jupiterMesh = new THREE.Mesh(jupiterGeo, jupiterMat);
    jupiterMesh.position.set(-25.0, 4.0, -75.0);
    jupiterMesh.userData = { id: 'jupiter', name: 'Jupiter (Sol V)' };
    scene.add(jupiterMesh);
    celestialBodies.push(jupiterMesh);
    interactableObjects.push(jupiterMesh);

    // 4. SATURN (Sol VI) — Clubs
    saturnGroup = new THREE.Group();
    saturnGroup.position.set(25.0, -3.0, -115.0);
    saturnGroup.rotation.z = THREE.MathUtils.degToRad(26.7);

    const saturnRadius = 6.0;
    const saturnGeo = new THREE.SphereGeometry(saturnRadius, 48, 48);
    const saturnTex = loadResilientTexture('saturn.jpg', '8k_saturn.jpg');
    const saturnMat = new THREE.MeshStandardMaterial({
      map: saturnTex,
      roughness: 0.88,
      metalness: 0.08
    });
    saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    saturnMesh.userData = { id: 'saturn', name: 'Saturn (Sol VI)' };
    saturnGroup.add(saturnMesh);
    interactableObjects.push(saturnMesh);

    // Saturn 3D Rings
    const ringInner = saturnRadius * 1.25;
    const ringOuter = saturnRadius * 2.35;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);

    const pos = ringGeo.attributes.position;
    const uvs = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const u = (dist - ringInner) / (ringOuter - ringInner);
      uvs.setXY(i, u, 0.5);
    }

    const ringTex = loadResilientTexture('saturn_ring.png', '8k_saturn_ring_alpha.png');
    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      roughness: 0.7
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    saturnGroup.add(ringMesh);

    scene.add(saturnGroup);
    celestialBodies.push(saturnGroup);

    // 5. NEPTUNE (Sol VIII) — Skills
    const neptuneRadius = 4.5;
    const neptuneGeo = new THREE.SphereGeometry(neptuneRadius, 48, 48);
    const neptuneTex = loadResilientTexture('neptune.jpg', '2k_neptune.jpg');
    const neptuneMat = new THREE.MeshStandardMaterial({
      map: neptuneTex,
      roughness: 0.75,
      metalness: 0.12
    });
    neptuneMesh = new THREE.Mesh(neptuneGeo, neptuneMat);
    neptuneMesh.position.set(-18.0, -4.0, -155.0);
    neptuneMesh.userData = { id: 'neptune', name: 'Neptune (Sol VIII)' };
    scene.add(neptuneMesh);
    celestialBodies.push(neptuneMesh);
    interactableObjects.push(neptuneMesh);

    // 6. THE MOON (Luna I) — Footer Section
    const footerMoonGeo = new THREE.SphereGeometry(3.5, 48, 48);
    footerMoonMesh = new THREE.Mesh(footerMoonGeo, moonMat);
    footerMoonMesh.position.set(0.0, 0.0, -200.0);
    footerMoonMesh.userData = { id: 'moon', name: 'The Moon (Luna I)' };
    scene.add(footerMoonMesh);
    celestialBodies.push(footerMoonMesh);
    interactableObjects.push(footerMoonMesh);

    // Distant Earth behind Moon
    const distantEarthGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const distantEarthMat = new THREE.MeshStandardMaterial({
      map: earthDayTex,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.4
    });
    const distantEarthMesh = new THREE.Mesh(distantEarthGeo, distantEarthMat);
    distantEarthMesh.position.set(8.0, 4.0, -260.0);
    scene.add(distantEarthMesh);
  }

  /* --------------------------------------------------------------------------
     Scroll Waypoint Tracking & Interpolation
     -------------------------------------------------------------------------- */
  function updateScrollPosition() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (docHeight <= 0) return;

    const scrollRatio = Math.max(0, Math.min(1, scrollTop / docHeight));

    const progressTrack = document.getElementById('orbital-progress-bar');
    if (progressTrack) {
      progressTrack.style.height = `${scrollRatio * 100}%`;
    }

    const totalWaypoints = WAYPOINTS.length;
    const segment = 1 / (totalWaypoints - 1);
    const currentSegmentIndex = Math.floor(scrollRatio / segment);
    const segmentRatio = (scrollRatio - currentSegmentIndex * segment) / segment;

    const idxA = Math.min(currentSegmentIndex, totalWaypoints - 1);
    const idxB = Math.min(idxA + 1, totalWaypoints - 1);

    const wpA = WAYPOINTS[idxA];
    const wpB = WAYPOINTS[idxB];

    const ease = segmentRatio * segmentRatio * (3 - 2 * segmentRatio);

    targetCamPos.lerpVectors(wpA.camPos, wpB.camPos, ease);
    targetLookAt.lerpVectors(wpA.lookAt, wpB.lookAt, ease);

    if (sunFlareSprite) {
      sunFlareSprite.material.opacity = Math.max(0, 1 - scrollRatio * 3.5);
    }

    const activeIndex = segmentRatio > 0.5 ? idxB : idxA;
    if (activeIndex !== currentWaypointIndex) {
      currentWaypointIndex = activeIndex;
      updateTelemetryHUD(WAYPOINTS[activeIndex]);
      updateTrackNodes(activeIndex);
    }
  }

  function updateTelemetryHUD(waypoint) {
    const targetEl = document.getElementById('hud-target-name');
    const altEl = document.getElementById('hud-alt-val');
    const velEl = document.getElementById('hud-vel-val');
    const coordsEl = document.getElementById('hud-coords-val');

    if (targetEl) targetEl.textContent = waypoint.name;
    if (altEl) altEl.textContent = waypoint.alt;
    if (velEl) velEl.textContent = waypoint.velocity;
    if (coordsEl) coordsEl.textContent = waypoint.coords;

    playTone(680, 0.08, 'sine');
  }

  function updateTrackNodes(activeIndex) {
    const nodes = document.querySelectorAll('.track-node');
    nodes.forEach((node, i) => {
      node.classList.toggle('active', i === activeIndex);
    });

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach((link, i) => {
      link.classList.toggle('active', i === activeIndex);
    });
  }

  /* --------------------------------------------------------------------------
     Raycasting & Interactive 3D Objects
     -------------------------------------------------------------------------- */
  function onPointerMove(e) {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

    mousePointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mousePointer, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    const hudReticle = document.getElementById('cyber-reticle');
    const canvas = document.getElementById('webgl-canvas');

    if (intersects.length > 0) {
      const topObj = intersects[0].object;
      canvas.style.cursor = 'pointer';
      if (hudReticle) {
        hudReticle.style.display = 'block';
        hudReticle.style.left = `${e.clientX + 15}px`;
        hudReticle.style.top = `${e.clientY + 15}px`;
        const objId = topObj.userData.id || 'target';
        const objName = topObj.userData.name || 'Celestial Body';
        hudReticle.innerHTML = `<span class="reticle-lock">[LOCKED]</span> <strong>${objName}</strong><br><small>Click to Inspect Dossier</small>`;
      }
      if (topObj !== hoveredObject) {
        hoveredObject = topObj;
        playTone(740, 0.05, 'triangle');
      }
    } else {
      canvas.style.cursor = isDragging ? 'grabbing' : 'default';
      if (hudReticle) hudReticle.style.display = 'none';
      hoveredObject = null;
    }
  }

  function onPointerClick(e) {
    // Only process click if not a long drag
    raycaster.setFromCamera(mousePointer, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      const dataKey = clicked.userData.id;
      if (dataKey && PLANET_DATA[dataKey]) {
        openPlanetDossier(dataKey);
        playTone(880, 0.12, 'sawtooth');
      }
    }
  }

  function openPlanetDossier(key) {
    const data = PLANET_DATA[key];
    if (!data) return;

    const dossier = document.getElementById('planet-dossier');
    const badgeEl = document.getElementById('dossier-badge');
    const titleEl = document.getElementById('dossier-title');
    const metaEl = document.getElementById('dossier-meta');
    const descEl = document.getElementById('dossier-desc');

    if (badgeEl) badgeEl.textContent = data.badge;
    if (titleEl) titleEl.textContent = data.name;
    if (metaEl) metaEl.textContent = data.meta;
    if (descEl) descEl.textContent = data.desc;

    if (dossier) {
      dossier.style.display = 'block';
      dossier.classList.add('active');
    }
  }

  function setupDossierControls() {
    const closeBtn = document.getElementById('close-dossier-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const dossier = document.getElementById('planet-dossier');
        if (dossier) {
          dossier.style.display = 'none';
          dossier.classList.remove('active');
        }
        playTone(400, 0.08, 'sine');
      });
    }

    const focusUzbekBtn = document.getElementById('btn-focus-uzbekistan');
    if (focusUzbekBtn) {
      focusUzbekBtn.addEventListener('click', () => {
        openPlanetDossier('beacon');
        if (earthGroup) {
          earthGroup.rotation.y = THREE.MathUtils.degToRad(202);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        playTone(980, 0.15, 'triangle');
      });
    }

    const toggleOrbitBtn = document.getElementById('btn-toggle-orbit');
    if (toggleOrbitBtn) {
      toggleOrbitBtn.addEventListener('click', () => {
        autoOrbit = !autoOrbit;
        toggleOrbitBtn.classList.toggle('active', autoOrbit);
        const textSpan = document.getElementById('orbit-btn-text');
        if (textSpan) {
          textSpan.textContent = autoOrbit ? 'Orbit: ON' : 'Orbit: OFF';
        }
        playTone(autoOrbit ? 880 : 440, 0.1, 'sine');
      });
    }

    const zoomInBtn = document.getElementById('btn-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoomLevel = Math.max(0.6, zoomLevel - 0.15);
        camera.fov = 45 * zoomLevel;
        camera.updateProjectionMatrix();
        playTone(660, 0.08, 'sine');
      });
    }

    const zoomOutBtn = document.getElementById('btn-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        zoomLevel = Math.min(1.4, zoomLevel + 0.15);
        camera.fov = 45 * zoomLevel;
        camera.updateProjectionMatrix();
        playTone(520, 0.08, 'sine');
      });
    }
  }

  /* --------------------------------------------------------------------------
     Event Listeners & Momentum Drag
     -------------------------------------------------------------------------- */
  function setupEvents() {
    window.addEventListener('scroll', updateScrollPosition, { passive: true });
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('click', onPointerClick);

    // Universal Smooth Scrolling for All In-Page Navigation Links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const targetId = href.slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
          playTone(660, 0.08, 'sine');
          if (history.pushState) {
            history.pushState(null, null, `#${targetId}`);
          }
        }
      });
    });

    // Track Node Clicks
    const trackNodes = document.querySelectorAll('.track-node');
    trackNodes.forEach((node) => {
      node.addEventListener('click', () => {
        const targetId = node.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
          playTone(660, 0.08, 'sine');
        }
      });
    });

    // Liquid Glass Specular Shimmer Mouse Tracking
    const glassCards = document.querySelectorAll('.glass-card, .neon-sign-outer, .dossier-card');
    window.addEventListener('mousemove', (e) => {
      glassCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (e.clientY >= rect.top - 100 && e.clientY <= rect.bottom + 100) {
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          card.style.setProperty('--card-mx', `${Math.max(0, Math.min(100, x))}%`);
          card.style.setProperty('--card-my', `${Math.max(0, Math.min(100, y))}%`);
        }
      });
    }, { passive: true });

    // 3D Planet Inspection Mode Toggle
    const inspectBtn = document.getElementById('inspect-btn');
    if (inspectBtn) {
      inspectBtn.addEventListener('click', () => {
        isInspectMode = !isInspectMode;
        inspectBtn.classList.toggle('active', isInspectMode);
        inspectBtn.innerHTML = isInspectMode
          ? '<span>🔄</span> Exit Inspect'
          : '<span>🪐</span> Inspect 3D';
        playTone(isInspectMode ? 880 : 440, 0.1, 'sine');
      });
    }

    // Drag to rotate with momentum
    const canvas = document.getElementById('webgl-canvas');
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousPointerPos.x;
      const deltaY = e.clientY - previousPointerPos.y;
      previousPointerPos = { x: e.clientX, y: e.clientY };

      spinVelocityX = deltaX * 0.005;
      spinVelocityY = deltaY * 0.005;

      const activeBody = celestialBodies[WAYPOINTS[currentWaypointIndex].bodyIndex];
      if (activeBody) {
        activeBody.rotation.y += spinVelocityX;
        activeBody.rotation.x += spinVelocityY;
      }
    });

    // Touch support for mobile
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousPointerPos.x;
      const deltaY = e.touches[0].clientY - previousPointerPos.y;
      previousPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      spinVelocityX = deltaX * 0.006;
      spinVelocityY = deltaY * 0.006;

      const activeBody = celestialBodies[WAYPOINTS[currentWaypointIndex].bodyIndex];
      if (activeBody) {
        activeBody.rotation.y += spinVelocityX;
        activeBody.rotation.x += spinVelocityY;
      }
    }, { passive: true });

    const audioBtn = document.getElementById('audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', toggleAudio);
    }

    const transForm = document.getElementById('transmission-form');
    if (transForm) {
      transForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const statusBox = document.getElementById('trans-status');
        if (statusBox) {
          statusBox.textContent = 'TRANSMISSION SENT: Tashakkur! Your message has beamed to Shahnoza.';
          statusBox.classList.add('success');
          playTone(920, 0.2, 'triangle');
          transForm.reset();
        }
      });
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateScrollPosition();
  }

  /* --------------------------------------------------------------------------
     Cosmic Audio Synthesizer (Web Audio API)
     -------------------------------------------------------------------------- */
  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

    ambientFilter = audioCtx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.setValueAtTime(240, audioCtx.currentTime);

    ambientOsc1 = audioCtx.createOscillator();
    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.setValueAtTime(55, audioCtx.currentTime);

    ambientOsc2 = audioCtx.createOscillator();
    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.setValueAtTime(82.41, audioCtx.currentTime);

    ambientOsc1.connect(ambientFilter);
    ambientOsc2.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);

    ambientOsc1.start();
    ambientOsc2.start();
  }

  function toggleAudio() {
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isAudioMuted = !isAudioMuted;
    const audioBtn = document.getElementById('audio-btn');

    if (!isAudioMuted) {
      ambientGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 1.2);
      if (audioBtn) {
        audioBtn.classList.add('active');
        audioBtn.innerHTML = '<span>🔊</span> Sound: ON';
      }
      playTone(520, 0.15, 'sine');
    } else {
      ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      if (audioBtn) {
        audioBtn.classList.remove('active');
        audioBtn.innerHTML = '<span>🔇</span> Sound: OFF';
      }
    }
  }

  function playTone(freq, duration, type = 'sine') {
    if (isAudioMuted || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     Main Render & Animation Loop
     -------------------------------------------------------------------------- */
  let beaconTime = 0;

  function animate() {
    requestAnimationFrame(animate);

    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    currentCamPos.lerp(targetCamPos, 0.06);
    currentLookAt.lerp(targetLookAt, 0.06);

    const parallaxCamX = currentCamPos.x + mouse.x * 0.45;
    const parallaxCamY = currentCamPos.y + mouse.y * 0.35;
    camera.position.set(parallaxCamX, parallaxCamY, currentCamPos.z);
    camera.lookAt(currentLookAt);

    if (cameraLight) {
      cameraLight.position.set(camera.position.x + 2, camera.position.y + 4, camera.position.z + 8);
    }

    // Apply Inertia to active planet
    const activeBody = celestialBodies[WAYPOINTS[currentWaypointIndex].bodyIndex];
    if (activeBody && !isDragging) {
      activeBody.rotation.y += spinVelocityX;
      activeBody.rotation.x += spinVelocityY;
      spinVelocityX *= 0.94;
      spinVelocityY *= 0.94;
    }

    // Animated Uzbekistan Beacon Pulse
    if (uzbekistanBeaconGroup) {
      beaconTime += 0.04;
      const pulseScale = 1.0 + Math.sin(beaconTime) * 0.25;
      uzbekistanBeaconGroup.children[0].scale.set(pulseScale, pulseScale, 1.0);
    }

    // Automatic Planetary Orbits (if enabled)
    if (autoOrbit) {
      if (earthMesh) earthMesh.rotation.y += 0.0006;
      if (cloudsMesh) cloudsMesh.rotation.y += 0.001;
      if (heroMoonMesh) heroMoonMesh.rotation.y += 0.0005;
      if (marsMesh) marsMesh.rotation.y += 0.0008;
      if (jupiterMesh) jupiterMesh.rotation.y += 0.0012;
      if (saturnMesh) saturnMesh.rotation.y += 0.001;
      if (neptuneMesh) neptuneMesh.rotation.y += 0.0007;
      if (footerMoonMesh) footerMoonMesh.rotation.y += 0.0005;
    }

    if (starField) starField.rotation.y -= 0.00008;

    renderer.render(scene, camera);
  }
})();
