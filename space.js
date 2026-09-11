/**
 * Shahnoza Raxmonberdiyeva — 3D Space Experience Engine
 * Photorealistic Three.js Planets • Atmospheric Shaders • Scroll Waypoints • Audio Synthesizer
 */

(function () {
  'use strict';

  let WAYPOINTS = [];
  let scene, camera, renderer;
  let celestialBodies = [];
  let earthGroup, earthMesh, cloudsMesh, atmosphereMesh;
  let heroMoonMesh;
  let marsMesh, jupiterMesh, saturnGroup, saturnMesh, neptuneMesh, footerMoonMesh;
  let sunFlareSprite, cameraLight;
  let starField;

  let currentCamPos, targetCamPos, currentLookAt, targetLookAt;
  let currentWaypointIndex = 0;

  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isInspectMode = false;
  let isDragging = false;
  let previousPointerPos = { x: 0, y: 0 };

  let audioCtx = null;
  let isAudioMuted = true;
  let ambientOsc1, ambientOsc2, ambientFilter, ambientGain;

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
        name: 'Earth (Sol III)',
        alt: '408 km',
        velocity: '7.66 km/s',
        coords: '38.7° N, 67.8° E [Uzbekistan]',
        camPos: new THREE.Vector3(0.0, 0.0, 10.0),
        lookAt: new THREE.Vector3(0.5, 0.0, 0.0),
        bodyIndex: 0
      },
      {
        id: 'education',
        name: 'Mars (Sol IV)',
        alt: '1,420 km',
        velocity: '4.68 km/s',
        coords: '18.4° N, 226.0° E [Olympus Mons]',
        camPos: new THREE.Vector3(13.0, 3.2, -26.0),
        lookAt: new THREE.Vector3(18.0, 3.0, -35.0),
        bodyIndex: 1
      },
      {
        id: 'initiatives',
        name: 'Jupiter (Sol V)',
        alt: '42,800 km',
        velocity: '13.07 km/s',
        coords: '22.1° S, 114.8° W [Great Red Spot]',
        camPos: new THREE.Vector3(-15.0, 4.5, -55.0),
        lookAt: new THREE.Vector3(-25.0, 4.0, -75.0),
        bodyIndex: 2
      },
      {
        id: 'clubs',
        name: 'Saturn (Sol VI)',
        alt: '35,600 km',
        velocity: '9.69 km/s',
        coords: 'Ring Plane Inclination: 26.7°',
        camPos: new THREE.Vector3(16.0, 0.0, -96.0),
        lookAt: new THREE.Vector3(25.0, -3.0, -115.0),
        bodyIndex: 3
      },
      {
        id: 'skills',
        name: 'Neptune (Sol VIII)',
        alt: '18,200 km',
        velocity: '5.43 km/s',
        coords: 'Deep Azure Mantle [Triton Horizon]',
        camPos: new THREE.Vector3(-10.0, -2.5, -138.0),
        lookAt: new THREE.Vector3(-18.0, -4.0, -155.0),
        bodyIndex: 4
      },
      {
        id: 'contact',
        name: 'The Moon (Luna I)',
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
      console.warn('Three.js Notice: Browsers block WebGL textures on file:// URLs. Run "start.bat" or deploy to web to see textures.');
    }

    setupLighting();
    setupCosmicBackground();
    buildCelestialSystem();
    setupEvents();


    // Trigger initial scroll update immediately
    updateScrollPosition();

    animate();
  }

  /* --------------------------------------------------------------------------
     Lighting & Sun Flare
     -------------------------------------------------------------------------- */
  function setupLighting() {
    // Subtle cosmic ambient light (deep space dark)
    const ambient = new THREE.AmbientLight(0x0a1428, 0.35);
    scene.add(ambient);

    // Primary Sun Light (illuminating Earth's limb from upper-left)
    const earthSunLight = new THREE.DirectionalLight(0xfff6e5, 1.8);
    earthSunLight.position.set(-16, 10, 7);
    earthSunLight.target.position.set(2.4, -2.2, 0.0);
    scene.add(earthSunLight);
    scene.add(earthSunLight.target);

    // Subtle planetary key light for Mars, Jupiter, Saturn as camera moves
    cameraLight = new THREE.DirectionalLight(0xffffff, 0.6);
    cameraLight.position.set(0, 5, 10);
    scene.add(cameraLight);

    createSunFlare();
  }


  function createSunFlare() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Central radiant burst
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.12, 'rgba(235, 248, 255, 0.95)');
    grad.addColorStop(0.28, 'rgba(56, 189, 248, 0.7)');
    grad.addColorStop(0.55, 'rgba(14, 165, 233, 0.25)');
    grad.addColorStop(1.0, 'rgba(3, 7, 18, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 8-Point Diffraction Spikes (like reference image sunrise)
    ctx.save();
    ctx.translate(256, 256);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
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
    // Positioned right on the upper-left horizon curve of Earth
    sunFlareSprite.position.set(-1.4, 1.35, 1.0);
    sunFlareSprite.scale.set(8.5, 8.5, 1.0);
    scene.add(sunFlareSprite);
  }

  /* --------------------------------------------------------------------------
     Cosmic Background & Twinkling Stars
     -------------------------------------------------------------------------- */
  function setupCosmicBackground() {
    // Deep space Milky Way skybox with resilient candidate loader
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

    // 3,500 Twinkling Particle Stars
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
        starColors[idx] = 0.5;
        starColors[idx + 1] = 0.85;
        starColors[idx + 2] = 1.0; // Cyan
      } else if (randColor > 0.65) {
        starColors[idx] = 1.0;
        starColors[idx + 1] = 0.88;
        starColors[idx + 2] = 0.6; // Amber
      } else {
        starColors[idx] = 0.96;
        starColors[idx + 1] = 0.98;
        starColors[idx + 2] = 1.0; // Starlight white
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
     Resilient Texture Loader (Auto-detects same-folder, " (2)" suffix, or CDN)
     -------------------------------------------------------------------------- */
  const CDN_BASE = 'https://raw.githubusercontent.com/Shriisoot/Planets-texture/master/';

  function loadResilientTexture(localFilename, cdnFilename, onLoaded) {
    const tex = new THREE.Texture();

    // Try candidates in order:
    // 1. Subfolder: e.g. "assets/textures/earth_day.jpg" (standard repository layout)
    // 2. Same-folder clean: e.g. "earth_day.jpg"
    // 3. Same-folder with " (2)": e.g. "earth_day (2).jpg"
    // 4. Remote CDN fallback
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
     Build Celestial System (Earth, Moon, Mars, Jupiter, Saturn, Neptune)
     -------------------------------------------------------------------------- */
  function buildCelestialSystem() {
    // 1. EARTH (Sol III) — The Hero Planet
    earthGroup = new THREE.Group();
    earthGroup.position.set(2.4, -2.2, 0.0);
    earthGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
    earthGroup.rotation.y = THREE.MathUtils.degToRad(140);

    const earthRadius = 4.8;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);

    const earthDayTex = loadResilientTexture('earth_day.jpg', '8k_earth_daymap.jpg');
    const earthNightTex = loadResilientTexture('earth_night.jpg', '8k_earth_nightmap.jpg');

    // Standard PBR Material: Day Map + Warm Emissive Night Lights
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthDayTex,
      emissive: new THREE.Color(0xffaa44),
      emissiveMap: earthNightTex,
      emissiveIntensity: 0.65,
      roughness: 0.7,
      metalness: 0.05
    });

    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

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
          gl_FragColor = vec4(0.25, 0.75, 1.0, 1.0) * intensity * 2.2;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmosphereMesh);

    scene.add(earthGroup);
    celestialBodies.push(earthGroup);

    // Hero Moon in upper-right cosmic sky (matching reference image)
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
    scene.add(heroMoonMesh);

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
    scene.add(marsMesh);
    celestialBodies.push(marsMesh);

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
    scene.add(jupiterMesh);
    celestialBodies.push(jupiterMesh);

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
    saturnGroup.add(saturnMesh);

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
    scene.add(neptuneMesh);
    celestialBodies.push(neptuneMesh);

    // 6. THE MOON (Luna I) — Footer Section
    const footerMoonGeo = new THREE.SphereGeometry(3.5, 48, 48);
    footerMoonMesh = new THREE.Mesh(footerMoonGeo, moonMat);
    footerMoonMesh.position.set(0.0, 0.0, -200.0);
    scene.add(footerMoonMesh);
    celestialBodies.push(footerMoonMesh);

    // Distant Earth hanging in space behind the Moon at footer
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

    // Update Right Edge Progress Bar
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

    // Fade out sun flare as user scrolls away from Earth
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
     Interaction & Event Handlers
     -------------------------------------------------------------------------- */
  function setupEvents() {
    window.addEventListener('scroll', updateScrollPosition, { passive: true });
    window.addEventListener('resize', onWindowResize);

    // Mouse movement parallax
    window.addEventListener('mousemove', (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Track Node Clicks
    const trackNodes = document.querySelectorAll('.track-node');
    trackNodes.forEach((node) => {
      node.addEventListener('click', () => {
        const targetId = node.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

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

    // Drag to rotate currently focused planet
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

      const activeBody = celestialBodies[WAYPOINTS[currentWaypointIndex].bodyIndex];
      if (activeBody) {
        activeBody.rotation.y += deltaX * 0.007;
        activeBody.rotation.x += deltaY * 0.007;
      }
    });

    // Touch support for mobile
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousPointerPos.x;
      const deltaY = e.touches[0].clientY - previousPointerPos.y;
      previousPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      const activeBody = celestialBodies[WAYPOINTS[currentWaypointIndex].bodyIndex];
      if (activeBody) {
        activeBody.rotation.y += deltaX * 0.008;
        activeBody.rotation.x += deltaY * 0.008;
      }
    });

    // Audio Mute Toggle Button
    const audioBtn = document.getElementById('audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', toggleAudio);
    }

    // Transmission form handling
    const transForm = document.getElementById('transmission-form');
    if (transForm) {
      transForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const statusBox = document.getElementById('trans-status');
        if (statusBox) {
          statusBox.textContent = 'TRANSMISSION SENT: Thank you! Your message has beamed to Shahnoza.';
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

    // Keep camera light tracking the camera
    if (cameraLight) {
      cameraLight.position.set(camera.position.x + 2, camera.position.y + 4, camera.position.z + 8);
    }

    // Celestial Rotations
    if (earthMesh) earthMesh.rotation.y += 0.0007;
    if (cloudsMesh) cloudsMesh.rotation.y += 0.0011;
    if (heroMoonMesh) heroMoonMesh.rotation.y += 0.0005;
    if (marsMesh) marsMesh.rotation.y += 0.0009;
    if (jupiterMesh) jupiterMesh.rotation.y += 0.0014;
    if (saturnMesh) saturnMesh.rotation.y += 0.0012;
    if (neptuneMesh) neptuneMesh.rotation.y += 0.0008;
    if (footerMoonMesh) footerMoonMesh.rotation.y += 0.0005;

    if (starField) starField.rotation.y -= 0.00008;

    renderer.render(scene, camera);
  }
})();
