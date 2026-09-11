/**
 * Shahnoza Raxmonberdiyeva — 3D Space Experience Engine
 * Photorealistic Three.js Planets • Atmospheric Shaders • Scroll Waypoints • Audio Synthesizer
 */

(function () {
  'use strict';

  // Check if THREE is available
  if (typeof THREE === 'undefined') {
    console.error('Three.js is not loaded.');
    return;
  }

  // Configuration & Waypoint Map
  const WAYPOINTS = [
    {
      id: 'hero',
      name: 'Earth (Sol III)',
      alt: '408 km',
      velocity: '7.66 km/s',
      coords: '38.7° N, 67.8° E [Uzbekistan]',
      camPos: new THREE.Vector3(-0.5, 0.4, 7.8),
      lookAt: new THREE.Vector3(1.8, -1.2, 0),
      bodyIndex: 0
    },
    {
      id: 'education',
      name: 'Mars (Sol IV)',
      alt: '1,420 km',
      velocity: '4.68 km/s',
      coords: '18.4° N, 226.0° E [Olympus Mons]',
      camPos: new THREE.Vector3(13.5, 4.2, -31.0),
      lookAt: new THREE.Vector3(18.0, 4.0, -40.0),
      bodyIndex: 1
    },
    {
      id: 'initiatives',
      name: 'Jupiter (Sol V)',
      alt: '42,800 km',
      velocity: '13.07 km/s',
      coords: '22.1° S, 114.8° W [Great Red Spot]',
      camPos: new THREE.Vector3(-19.0, 6.5, -63.0),
      lookAt: new THREE.Vector3(-32.0, 6.0, -85.0),
      bodyIndex: 2
    },
    {
      id: 'clubs',
      name: 'Saturn (Sol VI)',
      alt: '35,600 km',
      velocity: '9.69 km/s',
      coords: 'Ring Plane Inclination: 26.7°',
      camPos: new THREE.Vector3(22.0, 1.5, -114.0),
      lookAt: new THREE.Vector3(34.0, -5.0, -135.0),
      bodyIndex: 3
    },
    {
      id: 'skills',
      name: 'Neptune (Sol VIII)',
      alt: '18,200 km',
      velocity: '5.43 km/s',
      coords: 'Deep Azure Mantle [Triton Horizon]',
      camPos: new THREE.Vector3(-13.5, -5.8, -169.0),
      lookAt: new THREE.Vector3(-22.0, -8.0, -190.0),
      bodyIndex: 4
    },
    {
      id: 'contact',
      name: 'The Moon (Luna I)',
      alt: '112 km',
      velocity: '1.63 km/s',
      coords: '0.67° N, 23.47° E [Mare Tranquillitatis]',
      camPos: new THREE.Vector3(-2.2, 0.4, -248.0),
      lookAt: new THREE.Vector3(0.0, 0.0, -258.0),
      bodyIndex: 5
    }
  ];

  // Core Variables
  let scene, camera, renderer;
  let celestialBodies = [];
  let earthGroup, earthMesh, cloudsMesh, atmosphereMesh;
  let moonMesh, marsMesh, jupiterMesh, saturnGroup, saturnMesh, neptuneMesh;
  let sunLight, sunFlareSprite;
  let starField;

  // Camera & Scroll State
  let currentCamPos = new THREE.Vector3().copy(WAYPOINTS[0].camPos);
  let targetCamPos = new THREE.Vector3().copy(WAYPOINTS[0].camPos);
  let currentLookAt = new THREE.Vector3().copy(WAYPOINTS[0].lookAt);
  let targetLookAt = new THREE.Vector3().copy(WAYPOINTS[0].lookAt);
  let scrollFraction = 0;
  let currentWaypointIndex = 0;

  // Interaction State
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isInspectMode = false;
  let isDragging = false;
  let previousPointerPos = { x: 0, y: 0 };
  let inspectRotation = { x: 0, y: 0 };

  // Audio Synthesizer
  let audioCtx = null;
  let isAudioMuted = true;
  let ambientOsc1, ambientOsc2, ambientFilter, ambientGain;

  // Initialize
  init();

  function init() {
    const container = document.getElementById('webgl-container');
    const canvas = document.getElementById('webgl-canvas');

    // 1. Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.0018);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2500);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // 4. Lighting & Sunlight
    setupLighting();

    // 5. Starfield & Milky Way Background
    setupCosmicBackground();

    // 6. Build Celestial Bodies
    buildCelestialSystem();

    // 7. Event Listeners
    setupEvents();

    // 8. Animation Loop
    animate();
  }

  /* --------------------------------------------------------------------------
     Lighting & Sun Flare
     -------------------------------------------------------------------------- */
  function setupLighting() {
    // Subtle deep space cosmic ambient light
    const ambient = new THREE.AmbientLight(0x0e172e, 0.5);
    scene.add(ambient);

    // The Sun: Directional light originating from upper-left of Earth
    sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    sunLight.position.set(-30, 18, -12);
    scene.add(sunLight);

    // Secondary softer fill light
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
    fillLight.position.set(20, -10, 20);
    scene.add(fillLight);

    // Sunrise flare sprite on Earth's horizon limb (matching reference photo)
    createSunFlare();
  }

  function createSunFlare() {
    // Procedural canvas for lens flare corona & star rays
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.12, 'rgba(224, 242, 254, 0.85)');
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.12)');
    grad.addColorStop(1.0, 'rgba(3, 7, 18, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Star diffraction rays
    ctx.save();
    ctx.translate(256, 256);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.rotate((Math.PI * 2) / 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(240, 0);
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
    sunFlareSprite.position.set(-6.8, 4.2, -4.5);
    sunFlareSprite.scale.set(16, 16, 1);
    scene.add(sunFlareSprite);
  }

  /* --------------------------------------------------------------------------
     Cosmic Starfield & Galaxy Background
     -------------------------------------------------------------------------- */
  function setupCosmicBackground() {
    const textureLoader = new THREE.TextureLoader();

    // Skybox / Deep Starfield sphere
    textureLoader.load(
      'assets/textures/stars.jpg',
      function (starsTexture) {
        starsTexture.wrapS = THREE.RepeatWrapping;
        starsTexture.wrapT = THREE.RepeatWrapping;
        starsTexture.repeat.set(2, 2);

        const skyGeo = new THREE.SphereGeometry(1200, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
          map: starsTexture,
          side: THREE.BackSide,
          color: 0x8892b0
        });
        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        scene.add(skyMesh);
      },
      undefined,
      function () {
        console.warn('Fallback starfield initialized.');
      }
    );

    // Twinkling Particle Stars
    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const r = THREE.MathUtils.randFloat(150, 900);
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = THREE.MathUtils.randFloat(0, Math.PI);

      starPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[idx + 2] = r * Math.cos(phi);

      // Star color palette: warm starlight white, electric cyan, faint amber
      const randColor = Math.random();
      if (randColor > 0.8) {
        starColors[idx] = 0.55;
        starColors[idx + 1] = 0.85;
        starColors[idx + 2] = 1.0; // Cyan
      } else if (randColor > 0.65) {
        starColors[idx] = 1.0;
        starColors[idx + 1] = 0.85;
        starColors[idx + 2] = 0.55; // Amber
      } else {
        starColors[idx] = 0.95;
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
      opacity: 0.9,
      sizeAttenuation: true
    });

    starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
  }

  /* --------------------------------------------------------------------------
     Build Celestial System (Earth, Moon, Mars, Jupiter, Saturn, Neptune)
     -------------------------------------------------------------------------- */
  function buildCelestialSystem() {
    const loader = new THREE.TextureLoader();

    // 1. EARTH (Sol III) — The Hero Planet
    earthGroup = new THREE.Group();
    earthGroup.position.set(3.4, -3.6, -2.5);
    earthGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
    earthGroup.rotation.y = THREE.MathUtils.degToRad(120);

    const earthRadius = 6.2;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);

    // Day & Night Maps
    const earthDayTex = loader.load('assets/textures/earth_day.jpg');
    const earthNightTex = loader.load('assets/textures/earth_night.jpg');

    // Custom Day/Night & Atmospheric Rim Glow Shader
    const earthShader = {
      uniforms: {
        dayTexture: { value: earthDayTex },
        nightTexture: { value: earthNightTex },
        sunDirection: { value: new THREE.Vector3(-1.0, 0.6, -0.4).normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
          // Normalize normal
          vec3 n = normalize(vNormal);
          float sunDot = dot(n, normalize(sunDirection));
          
          // Day-to-night blend
          float dayMix = smoothstep(-0.25, 0.25, sunDot);
          vec4 dayCol = texture2D(dayTexture, vUv);
          vec4 nightCol = texture2D(nightTexture, vUv);

          // Vivid night city lights
          vec3 nightLights = nightCol.rgb * vec3(2.1, 1.7, 1.15);
          vec3 surface = mix(nightLights, dayCol.rgb * 1.18, dayMix);

          // Atmospheric Fresnel Rim Glow (Cyan Rayleigh scattering)
          float fresnel = 1.0 - max(0.0, dot(normalize(vViewDir), n));
          fresnel = pow(fresnel, 3.4);
          vec3 rimAtmosphere = vec3(0.28, 0.72, 1.0) * fresnel * 2.2;

          gl_FragColor = vec4(surface + rimAtmosphere, 1.0);
        }
      `
    };

    const earthMat = new THREE.ShaderMaterial({
      uniforms: earthShader.uniforms,
      vertexShader: earthShader.vertexShader,
      fragmentShader: earthShader.fragmentShader
    });

    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Earth Clouds Sphere
    const cloudsTex = loader.load('assets/textures/earth_clouds.jpg');
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.018, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthGroup.add(cloudsMesh);

    // Atmospheric Outer Glow Shell (Fresnel Halo)
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.032, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vViewDir), 3.0);
          gl_FragColor = vec4(0.25, 0.7, 1.0, 1.0) * intensity * 1.8;
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

    // 2. MARS (Sol IV) — Education Section
    const marsRadius = 3.4;
    const marsGeo = new THREE.SphereGeometry(marsRadius, 48, 48);
    const marsTex = loader.load('assets/textures/mars.jpg');
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.85,
      metalness: 0.1
    });
    marsMesh = new THREE.Mesh(marsGeo, marsMat);
    marsMesh.position.set(18.0, 4.0, -40.0);
    scene.add(marsMesh);
    celestialBodies.push(marsMesh);

    // 3. JUPITER (Sol V) — Leadership & Initiatives Section
    const jupiterRadius = 8.5;
    const jupiterGeo = new THREE.SphereGeometry(jupiterRadius, 64, 64);
    const jupiterTex = loader.load('assets/textures/jupiter.jpg');
    const jupiterMat = new THREE.MeshStandardMaterial({
      map: jupiterTex,
      roughness: 0.9,
      metalness: 0.05
    });
    jupiterMesh = new THREE.Mesh(jupiterGeo, jupiterMat);
    jupiterMesh.position.set(-32.0, 6.0, -85.0);
    scene.add(jupiterMesh);
    celestialBodies.push(jupiterMesh);

    // 4. SATURN (Sol VI) — Clubs & Student Ecosystem Section
    saturnGroup = new THREE.Group();
    saturnGroup.position.set(34.0, -5.0, -135.0);
    saturnGroup.rotation.z = THREE.MathUtils.degToRad(26.7);

    const saturnRadius = 6.2;
    const saturnGeo = new THREE.SphereGeometry(saturnRadius, 48, 48);
    const saturnTex = loader.load('assets/textures/saturn.jpg');
    const saturnMat = new THREE.MeshStandardMaterial({
      map: saturnTex,
      roughness: 0.88,
      metalness: 0.08
    });
    saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    saturnGroup.add(saturnMesh);

    // Saturn's Iconic Rings
    const ringInner = saturnRadius * 1.25;
    const ringOuter = saturnRadius * 2.35;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);
    
    // Adjust ring UV mapping to map radial textures correctly
    const pos = ringGeo.attributes.position;
    const uvs = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const u = (dist - ringInner) / (ringOuter - ringInner);
      uvs.setXY(i, u, 0.5);
    }

    const ringTex = loader.load('assets/textures/saturn_ring.png');
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

    // 5. NEPTUNE (Sol VIII) — Skills & Languages Section
    const neptuneRadius = 4.8;
    const neptuneGeo = new THREE.SphereGeometry(neptuneRadius, 48, 48);
    const neptuneTex = loader.load('assets/textures/neptune.jpg');
    const neptuneMat = new THREE.MeshStandardMaterial({
      map: neptuneTex,
      roughness: 0.75,
      metalness: 0.15
    });
    neptuneMesh = new THREE.Mesh(neptuneGeo, neptuneMat);
    neptuneMesh.position.set(-22.0, -8.0, -190.0);
    scene.add(neptuneMesh);
    celestialBodies.push(neptuneMesh);

    // 6. THE MOON (Luna I) — Footer & Hero Background
    const moonRadius = 3.2;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 48, 48);
    const moonTex = loader.load('assets/textures/moon.jpg');
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.92,
      metalness: 0.05
    });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(0.0, 0.0, -258.0);
    scene.add(moonMesh);
    celestialBodies.push(moonMesh);

    // A secondary Moon instance hanging in the background during Earth's hero view (matching user's image)
    const heroMoonGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const heroMoonMesh = new THREE.Mesh(heroMoonGeo, moonMat);
    heroMoonMesh.position.set(6.8, 1.2, -6.5);
    scene.add(heroMoonMesh);
  }

  /* --------------------------------------------------------------------------
     Scroll Waypoint Tracking & Interpolation
     -------------------------------------------------------------------------- */
  function updateScrollPosition() {
    const sections = WAYPOINTS.map((w) => document.getElementById(w.id));
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    if (docHeight <= 0) return;

    const scrollRatio = Math.max(0, Math.min(1, scrollTop / docHeight));
    
    // Update Right Edge Progress Bar
    const progressTrack = document.getElementById('orbital-progress-bar');
    if (progressTrack) {
      progressTrack.style.height = `${scrollRatio * 100}%`;
    }

    // Determine continuous waypoint float index (0.0 to 5.0)
    const totalWaypoints = WAYPOINTS.length;
    const segment = 1 / (totalWaypoints - 1);
    const currentSegmentIndex = Math.floor(scrollRatio / segment);
    const segmentRatio = (scrollRatio - currentSegmentIndex * segment) / segment;

    const idxA = Math.min(currentSegmentIndex, totalWaypoints - 1);
    const idxB = Math.min(idxA + 1, totalWaypoints - 1);

    const wpA = WAYPOINTS[idxA];
    const wpB = WAYPOINTS[idxB];

    // Smooth cubic ease for segment transition
    const ease = segmentRatio * segmentRatio * (3 - 2 * segmentRatio);

    targetCamPos.lerpVectors(wpA.camPos, wpB.camPos, ease);
    targetLookAt.lerpVectors(wpA.lookAt, wpB.lookAt, ease);

    // Update active telemetry HUD if section changed
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

    // Trigger subtle UI beep when changing orbit
    playTone(680, 0.08, 'sine');
  }

  function updateTrackNodes(activeIndex) {
    const nodes = document.querySelectorAll('.track-node');
    nodes.forEach((node, i) => {
      if (i === activeIndex) {
        node.classList.add('active');
      } else {
        node.classList.remove('active');
      }
    });

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach((link, i) => {
      if (i === activeIndex) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
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

    // Drag-to-rotate in 3D canvas
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
        activeBody.rotation.y += deltaX * 0.006;
        activeBody.rotation.x += deltaY * 0.006;
      }
    });

    // Touch support for drag
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
  }

  /* --------------------------------------------------------------------------
     Cosmic Audio Synthesizer (Web Audio API)
     -------------------------------------------------------------------------- */
  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Ambient interstellar drone synthesizer
    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

    ambientFilter = audioCtx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.setValueAtTime(220, audioCtx.currentTime);

    // Warm chord oscillators
    ambientOsc1 = audioCtx.createOscillator();
    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.setValueAtTime(55, audioCtx.currentTime); // A1

    ambientOsc2 = audioCtx.createOscillator();
    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.setValueAtTime(82.41, audioCtx.currentTime); // E2 fifth

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
    } catch (e) {
      // Ignore audio glitches
    }
  }

  /* --------------------------------------------------------------------------
     Main Render & Animation Loop
     -------------------------------------------------------------------------- */
  function animate() {
    requestAnimationFrame(animate);

    // Smooth lerp mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Smooth lerp camera position & lookAt target
    currentCamPos.lerp(targetCamPos, 0.05);
    currentLookAt.lerp(targetLookAt, 0.05);

    // Apply subtle parallax offset to camera position
    const parallaxCamX = currentCamPos.x + mouse.x * 0.45;
    const parallaxCamY = currentCamPos.y + mouse.y * 0.35;
    camera.position.set(parallaxCamX, parallaxCamY, currentCamPos.z);
    camera.lookAt(currentLookAt);

    // Celestial Rotations
    if (earthMesh) {
      earthMesh.rotation.y += 0.0007;
    }
    if (cloudsMesh) {
      cloudsMesh.rotation.y += 0.0011; // Clouds drift faster than Earth
    }
    if (marsMesh) {
      marsMesh.rotation.y += 0.0009;
    }
    if (jupiterMesh) {
      jupiterMesh.rotation.y += 0.0014;
    }
    if (saturnMesh) {
      saturnMesh.rotation.y += 0.0012;
    }
    if (neptuneMesh) {
      neptuneMesh.rotation.y += 0.0008;
    }
    if (moonMesh) {
      moonMesh.rotation.y += 0.0005;
    }

    // Gentle starfield twinkle
    if (starField) {
      starField.rotation.y -= 0.00008;
    }

    renderer.render(scene, camera);
  }
})();
