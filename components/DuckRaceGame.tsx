"use client";

import Link from "next/link";
import * as THREE from "three";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lunix-duck-race-class";
const TRACK_LENGTH = 86;

const EVENTS = [
  { id: "bread", title: "BÁNH MÌ RƠI TỪ TRÊN TRỜI!", subtitle: "Có vịt quên luôn mình đang thi.", emoji: "🥖" },
  { id: "ancestors", title: "ÔNG BÀ GÁNH CÒNG LƯNG!", subtitle: "Một vịt cuối bảng bỗng nhớ ra mình là nhân vật chính.", emoji: "🔥" },
  { id: "traffic", title: "CSGT AO LÀNG XUẤT HIỆN!", subtitle: "Chạy nhanh quá cũng là một cái tội.", emoji: "🚨" },
  { id: "ufo", title: "UFO BẮT CÓC!", subtitle: "Không ai hỏi vì sao UFO lại quan tâm đến vịt.", emoji: "👽" },
  { id: "slipper", title: "NHẶT ĐƯỢC DÉP TỔ ONG!", subtitle: "Không hiểu sao mang dép lại chạy nhanh hơn.", emoji: "🩴" },
  { id: "nap", title: "5 PHÚT NỮA EM CHẠY TIẾP!", subtitle: "Một chiến binh quyết định ngủ giữa đường.", emoji: "😴" },
  { id: "drama", title: "DRAMA AO LÀNG!", subtitle: "Hai vịt dừng lại cãi nhau về quyền ưu tiên.", emoji: "💢" },
] as const;

const WINNER_TITLES = [
  "VUA AO LÀNG",
  "CHIẾN THẦN MỎ VÀNG",
  "NHÂN VẬT CHÍNH ĐƯỢC TỔ TIÊN CHỌN",
  "NHÀ VÔ ĐỊCH KHÔNG AI HIỂU VÌ SAO",
  "THẮNG BẰNG THỰC LỰC... CHẮC VẬY",
  "BẬC THẦY CHIẾN THUẬT CHẠY ĐẠI",
];

const DUCK_COLORS = [
  ["#ffd44a", "#ffe989"],
  ["#fff5d5", "#ffffff"],
  ["#e8b76e", "#f6d59d"],
  ["#f4d35e", "#fff0a3"],
  ["#ded7c8", "#f8f4eb"],
] as const;

type DuckRig = {
  group: THREE.Group;
  body: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  tail: THREE.Mesh;
};

type Racer = {
  index: number;
  name: string;
  rig: DuckRig;
  progress: number;
  baseSpeed: number;
  targetX: number;
  startZ: number;
  finishDistance: number;
  phase: number;
  finishedAt: number | null;
  boostUntil: number;
  slowUntil: number;
  napUntil: number;
  ufoUntil: number;
  dramaUntil: number;
  effectText: string;
};

type RaceResult = {
  index: number;
  name: string;
};

function parseNames(value: string) {
  return value
    .split(/[\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function randomInt(max: number) {
  if (max <= 1) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return Math.floor((buffer[0] / 4294967296) * max);
  }
  return Math.floor(Math.random() * max);
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function standardMaterial(
  color: THREE.ColorRepresentation,
  roughness = 0.72,
  metalness = 0,
) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function sphere(
  radius: number,
  color: THREE.ColorRepresentation,
  segments: number,
  scale: [number, number, number] = [1, 1, 1],
  roughness = 0.7,
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, Math.max(6, Math.floor(segments * 0.7))),
    standardMaterial(color, roughness),
  );
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(
  width: number,
  height: number,
  depth: number,
  color: THREE.ColorRepresentation,
  roughness = 0.82,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    standardMaterial(color, roughness),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: THREE.ColorRepresentation,
  segments = 10,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    standardMaterial(color, 0.9),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createDuck(scale: number, index: number, detailed: boolean): DuckRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const segments = detailed ? 18 : 10;
  const palette = DUCK_COLORS[index % DUCK_COLORS.length];
  const mainColor = palette[0];
  const lightColor = palette[1];

  const body = sphere(0.82, mainColor, segments, [1.0, 0.92, 1.18], 0.62);
  body.position.set(0, 1.13, 0);
  bodyGroup.add(body);

  const belly = sphere(0.58, lightColor, segments, [0.86, 0.82, 0.6], 0.72);
  belly.position.set(0, 1.02, 0.72);
  bodyGroup.add(belly);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.18, 0.48);
  const head = sphere(0.64, mainColor, segments, [1, 0.96, 1], 0.62);
  headGroup.add(head);

  const beak = sphere(0.33, "#f28a2b", detailed ? 14 : 8, [1.35, 0.48, 0.78], 0.55);
  beak.position.set(0, -0.08, 0.62);
  headGroup.add(beak);

  if (detailed) {
    const eyeWhiteLeft = sphere(0.13, "#ffffff", 10, [1, 1.08, 0.55], 0.45);
    const eyeWhiteRight = eyeWhiteLeft.clone();
    eyeWhiteLeft.position.set(-0.22, 0.17, 0.53);
    eyeWhiteRight.position.set(0.22, 0.17, 0.53);
    headGroup.add(eyeWhiteLeft, eyeWhiteRight);

    const pupilLeft = sphere(0.067, "#17152b", 8, [1, 1.05, 0.6], 0.38);
    const pupilRight = pupilLeft.clone();
    pupilLeft.position.set(-0.22, 0.17, 0.625);
    pupilRight.position.set(0.22, 0.17, 0.625);
    headGroup.add(pupilLeft, pupilRight);

    const highlightLeft = sphere(0.018, "#ffffff", 6, [1, 1, 0.5], 0.3);
    const highlightRight = highlightLeft.clone();
    highlightLeft.position.set(-0.198, 0.19, 0.666);
    highlightRight.position.set(0.242, 0.19, 0.666);
    headGroup.add(highlightLeft, highlightRight);
  } else {
    const leftEye = sphere(0.075, "#17152b", 7, [1, 1.1, 0.6], 0.4);
    const rightEye = leftEye.clone();
    leftEye.position.set(-0.22, 0.18, 0.56);
    rightEye.position.set(0.22, 0.18, 0.56);
    headGroup.add(leftEye, rightEye);
  }
  bodyGroup.add(headGroup);

  const wingGeometry = new THREE.SphereGeometry(0.55, segments, Math.max(6, Math.floor(segments * 0.7)));
  const wingMaterial = standardMaterial(index % 2 ? mainColor : "#e6b833", 0.72);
  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial.clone());
  leftWing.scale.set(0.34, 0.78, 1.05);
  rightWing.scale.set(0.34, 0.78, 1.05);
  leftWing.position.set(-0.72, 1.18, -0.02);
  rightWing.position.set(0.72, 1.18, -0.02);
  leftWing.rotation.z = 0.24;
  rightWing.rotation.z = -0.24;
  leftWing.castShadow = rightWing.castShadow = true;
  bodyGroup.add(leftWing, rightWing);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  const legMat = standardMaterial("#e97d24", 0.68);
  const legGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.46, 8);
  const footGeo = new THREE.SphereGeometry(0.22, 10, 7);

  const leftShin = new THREE.Mesh(legGeo, legMat);
  const rightShin = new THREE.Mesh(legGeo, legMat.clone());
  leftShin.position.y = -0.12;
  rightShin.position.y = -0.12;
  const leftFoot = new THREE.Mesh(footGeo, legMat.clone());
  const rightFoot = new THREE.Mesh(footGeo, legMat.clone());
  leftFoot.scale.set(1.15, 0.26, 1.5);
  rightFoot.scale.set(1.15, 0.26, 1.5);
  leftFoot.position.set(0, -0.38, 0.16);
  rightFoot.position.set(0, -0.38, 0.16);
  leftLeg.add(leftShin, leftFoot);
  rightLeg.add(rightShin, rightFoot);
  leftLeg.position.set(-0.31, 0.47, 0.04);
  rightLeg.position.set(0.31, 0.47, 0.04);
  bodyGroup.add(leftLeg, rightLeg);

  const tail = sphere(0.27, mainColor, detailed ? 12 : 8, [0.7, 0.65, 1.25], 0.68);
  tail.position.set(0, 1.22, -0.97);
  tail.rotation.x = -0.45;
  bodyGroup.add(tail);

  if (detailed && index % 4 === 0) {
    const hat = cylinder(0.42, 0.46, 0.16, index % 8 === 0 ? "#c40d02" : "#314b8c", 16);
    hat.position.set(0, 2.82, 0.44);
    const crown = cylinder(0.27, 0.31, 0.31, index % 8 === 0 ? "#c40d02" : "#314b8c", 16);
    crown.position.set(0, 3.02, 0.44);
    group.add(hat, crown);
  }

  group.scale.setScalar(scale);
  return { group, body: bodyGroup, leftWing, rightWing, leftLeg, rightLeg, head: headGroup, tail };
}

function animateDuck(rig: DuckRig, phase: number, speed = 1, airborne = false) {
  const gait = Math.sin(phase);
  const fast = THREE.MathUtils.clamp(speed, 0.15, 1.7);
  const lean = Math.min(0.22, Math.max(0, fast - 0.85) * 0.17);

  rig.body.rotation.z = gait * 0.11 * fast;
  rig.body.rotation.x = -lean + Math.abs(Math.sin(phase * 2)) * 0.025;
  rig.body.position.y = Math.abs(Math.sin(phase * 2)) * 0.06 * fast;

  rig.leftLeg.rotation.x = gait * 0.86 * fast;
  rig.rightLeg.rotation.x = -gait * 0.86 * fast;
  rig.leftWing.rotation.z = 0.24 + Math.sin(phase * 1.35) * 0.28 * fast;
  rig.rightWing.rotation.z = -0.24 - Math.sin(phase * 1.35) * 0.28 * fast;
  rig.leftWing.rotation.x = airborne ? -0.7 + Math.sin(phase * 2.2) * 0.45 : Math.sin(phase) * 0.12;
  rig.rightWing.rotation.x = airborne ? 0.7 - Math.sin(phase * 2.2) * 0.45 : -Math.sin(phase) * 0.12;
  rig.head.rotation.y = Math.sin(phase * 0.38) * 0.12;
  rig.head.rotation.z = -gait * 0.035;
  rig.tail.rotation.y = Math.sin(phase * 1.6) * 0.25;
}

function playRaceSound(kind: "start" | "event" | "finish") {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.connect(context.destination);
    const patterns = {
      start: [280, 420, 620],
      event: [520, 300],
      finish: [520, 680, 860, 1080],
    };
    const notes = patterns[kind];
    notes.forEach((note, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = kind === "event" ? "square" : "sine";
      oscillator.frequency.value = note;
      const start = context.currentTime + index * 0.09;
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
    gain.gain.setValueAtTime(0.09, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.65);
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // Trình duyệt có thể chặn âm thanh.
  }
}

export function DuckRaceGame() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);
  const racersRef = useRef<Racer[]>([]);
  const targetOrderRef = useRef<number[]>([]);
  const finishOrderRef = useRef<RaceResult[]>([]);
  const nextEventAtRef = useRef(0);
  const lastEventIdRef = useRef("");
  const mutedRef = useRef(false);
  const finalSprintShownRef = useRef(false);
  const focusIndexRef = useRef<number | null>(null);
  const focusUntilRef = useRef(0);

  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [entered, setEntered] = useState(false);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [eventText, setEventText] = useState<{ title: string; subtitle: string; emoji: string } | null>(null);
  const [rankings, setRankings] = useState<string[]>([]);
  const [result, setResult] = useState<RaceResult[]>([]);
  const [winnerTitle, setWinnerTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const saved = JSON.parse(stored) as string[];
      if (Array.isArray(saved)) setDraft(saved.filter(Boolean).join("\n"));
    } catch {
      // Bỏ qua dữ liệu hỏng.
    }
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const enterRace = useCallback(() => {
    const parsed = parseNames(draft);
    if (parsed.length < 2) {
      setError("Cần ít nhất 2 học sinh để đua.");
      return;
    }
    setError("");
    setNames(parsed);
    setEntered(true);
    setResult([]);
    setRankings([]);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Không ảnh hưởng game.
    }
  }, [draft]);

  const startRace = useCallback(() => {
    if (runningRef.current || names.length < 2 || racersRef.current.length !== names.length) return;
    const order = shuffle(names.map((_, index) => index));
    targetOrderRef.current = order;
    finishOrderRef.current = [];
    startedAtRef.current = performance.now();
    nextEventAtRef.current = 5200 + Math.random() * 1800;
    lastEventIdRef.current = "";
    finalSprintShownRef.current = false;
    focusIndexRef.current = null;
    focusUntilRef.current = 0;

    racersRef.current.forEach((racer) => {
      racer.progress = 0;
      racer.finishedAt = null;
      racer.boostUntil = 0;
      racer.slowUntil = 0;
      racer.napUntil = 0;
      racer.ufoUntil = 0;
      racer.dramaUntil = 0;
      racer.effectText = "";
      racer.rig.group.position.z = racer.startZ;
      racer.rig.group.position.y = 0;
      racer.rig.group.rotation.set(0, Math.PI, 0);
      racer.rig.body.scale.set(1, 1, 1);
    });

    runningRef.current = true;
    setRunning(true);
    setResult([]);
    setRankings([]);
    setEventText({ title: "ĐẠI LOẠN AO LÀNG!", subtitle: "Không phải con vịt nhanh nhất sẽ thắng.", emoji: "🦆" });
    window.setTimeout(() => setEventText(null), 1900);
    if (!mutedRef.current) playRaceSound("start");
  }, [names]);

  const triggerEvent = useCallback((now: number) => {
    const racers = racersRef.current.filter((racer) => racer.finishedAt === null);
    if (racers.length < 2) return;

    const choices = EVENTS.filter((event) => event.id !== lastEventIdRef.current);
    const event = choices[randomInt(choices.length)];
    lastEventIdRef.current = event.id;
    setEventText(event);
    window.setTimeout(() => setEventText(null), 2600);
    if (!mutedRef.current) playRaceSound("event");

    const byProgress = [...racers].sort(
      (a, b) => b.progress / b.finishDistance - a.progress / a.finishDistance,
    );
    const randomRacer = () => racers[randomInt(racers.length)];
    let focus: Racer | null = null;

    if (event.id === "bread") {
      const victims = shuffle(racers).slice(0, Math.max(1, Math.ceil(racers.length * 0.18)));
      victims.forEach((racer) => {
        racer.slowUntil = now + 2600;
        racer.effectText = "🥖 Bỏ đua đi ăn";
      });
      focus = victims[0] ?? null;
    }

    if (event.id === "ancestors") {
      const racer = byProgress[byProgress.length - 1];
      racer.boostUntil = now + 3400;
      racer.effectText = "🔥 Ông bà đang gánh";
      focus = racer;
    }

    if (event.id === "traffic") {
      const racer = byProgress[0];
      racer.slowUntil = now + 2800;
      racer.effectText = "🚨 Tấp vào lề!";
      focus = racer;
    }

    if (event.id === "ufo") {
      const racer = randomRacer();
      racer.ufoUntil = now + 2400;
      racer.slowUntil = now + 1900;
      racer.effectText = "👽 Đang được UFO chăm sóc";
      focus = racer;
    }

    if (event.id === "slipper") {
      const racer = randomRacer();
      racer.boostUntil = now + 3600;
      racer.effectText = "🩴 Dép tổ ong +100 uy tín";
      focus = racer;
    }

    if (event.id === "nap") {
      const racer = randomRacer();
      racer.napUntil = now + 2600;
      racer.effectText = "😴 5 phút nữa chạy";
      focus = racer;
    }

    if (event.id === "drama") {
      const pair = shuffle(racers).slice(0, 2);
      pair.forEach((racer) => {
        racer.dramaUntil = now + 2200;
        racer.effectText = "💢 Đang cãi nhau";
      });
      focus = pair[0] ?? null;
    }

    if (focus) {
      focusIndexRef.current = focus.index;
      focusUntilRef.current = now + 2200;
    }
  }, []);

  useEffect(() => {
    if (!entered || names.length < 2) return;
    const mount = mountRef.current;
    const labelsLayer = labelsRef.current;
    if (!mount || !labelsLayer) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#91d9f4");
    scene.fog = new THREE.Fog("#c9effa", 45, 132);

    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 200);
    camera.position.set(0, 11, 24);
    camera.lookAt(0, 1.5, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: names.length < 100, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, names.length > 70 ? 1.35 : 1.8));
    renderer.shadowMap.enabled = names.length <= 48;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = "duck-three-canvas";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff9df", "#547c43", 2.7));
    const sun = new THREE.DirectionalLight("#fff0c2", 4.4);
    sun.position.set(-16, 28, 15);
    sun.castShadow = names.length <= 48;
    sun.shadow.mapSize.set(names.length > 30 ? 1024 : 1536, names.length > 30 ? 1024 : 1536);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    scene.add(sun);

    const fill = new THREE.DirectionalLight("#b7e5ff", 1.35);
    fill.position.set(12, 10, -20);
    scene.add(fill);

    const count = names.length;
    const trackWidth = THREE.MathUtils.clamp(15 + Math.sqrt(count) * 1.9, 18, 42);
    const duckScale = THREE.MathUtils.clamp(1.02 - Math.log2(Math.max(2, count)) * 0.085, 0.42, 0.82);
    const detailedDucks = count <= 64;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 185),
      new THREE.MeshStandardMaterial({ color: "#78af58", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.08, -38);
    ground.receiveShadow = true;
    scene.add(ground);

    const track = new THREE.Mesh(
      new THREE.PlaneGeometry(trackWidth, TRACK_LENGTH + 19),
      new THREE.MeshStandardMaterial({ color: "#d7a45f", roughness: 0.96 }),
    );
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0.02, -TRACK_LENGTH / 2 + 4);
    track.receiveShadow = true;
    scene.add(track);

    const trackEdgeLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, TRACK_LENGTH + 18),
      new THREE.MeshStandardMaterial({ color: "#efd184", roughness: 0.9 }),
    );
    const trackEdgeRight = trackEdgeLeft.clone();
    trackEdgeLeft.rotation.x = trackEdgeRight.rotation.x = -Math.PI / 2;
    trackEdgeLeft.position.set(-trackWidth / 2 + 0.18, 0.035, -TRACK_LENGTH / 2 + 4);
    trackEdgeRight.position.set(trackWidth / 2 - 0.18, 0.035, -TRACK_LENGTH / 2 + 4);
    scene.add(trackEdgeLeft, trackEdgeRight);

    const mud = new THREE.Mesh(
      new THREE.PlaneGeometry(trackWidth - 0.9, 10),
      new THREE.MeshStandardMaterial({ color: "#70472e", roughness: 0.82 }),
    );
    mud.rotation.x = -Math.PI / 2;
    mud.position.set(0, 0.045, -27);
    scene.add(mud);

    const waterMaterial = new THREE.MeshStandardMaterial({
      color: "#42bfd1",
      roughness: 0.22,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(trackWidth - 0.9, 9), waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.055, -51);
    scene.add(water);

    const bridgeZ = -39;
    const bridge = box(trackWidth - 2.2, 0.2, 5.2, "#9a673d", 0.9);
    bridge.position.set(0, 0.11, bridgeZ);
    scene.add(bridge);
    for (let x = -trackWidth / 2 + 1.4; x <= trackWidth / 2 - 1.4; x += 1.7) {
      const seam = box(0.07, 0.025, 5.0, "#71462c", 0.95);
      seam.position.set(x, 0.23, bridgeZ);
      scene.add(seam);
    }

    const finishLine = new THREE.Group();
    const finishZ = -TRACK_LENGTH + 5;
    for (let x = -trackWidth / 2; x < trackWidth / 2; x += 1.4) {
      const tile = box(1.4, 0.08, 1.2, Math.round((x + trackWidth / 2) / 1.4) % 2 ? "#ffffff" : "#17152b");
      tile.position.set(x + 0.7, 0.08, finishZ);
      finishLine.add(tile);
    }
    scene.add(finishLine);

    const archLeft = cylinder(0.28, 0.34, 5.2, "#c40d02", 12);
    const archRight = archLeft.clone();
    const archTop = box(trackWidth + 1.4, 0.7, 0.78, "#c40d02", 0.72);
    archLeft.position.set(-trackWidth / 2 - 0.55, 2.6, finishZ);
    archRight.position.set(trackWidth / 2 + 0.55, 2.6, finishZ);
    archTop.position.set(0, 5.05, finishZ);
    scene.add(archLeft, archRight, archTop);

    const startBar = box(trackWidth + 1.4, 0.46, 0.58, "#f59814", 0.74);
    startBar.position.set(0, 4.2, 3.8);
    scene.add(startBar);
    const startLeft = cylinder(0.23, 0.3, 4.2, "#f59814", 12);
    const startRight = startLeft.clone();
    startLeft.position.set(-trackWidth / 2 - 0.42, 2.1, 3.8);
    startRight.position.set(trackWidth / 2 + 0.42, 2.1, 3.8);
    scene.add(startLeft, startRight);

    const treeCount = count > 90 ? 22 : 34;
    for (let i = 0; i < treeCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 7 - (i / treeCount) * (TRACK_LENGTH + 18);
      const x = side * (trackWidth / 2 + 3.0 + (i % 4) * 0.9);
      const trunk = cylinder(0.18, 0.28, 1.55, "#7b4c2d", 8);
      trunk.position.set(x, 0.75, z);
      const crownColor = i % 4 === 0 ? "#5b9d49" : "#70b856";
      const crownA = sphere(0.85, crownColor, 9, [1.05, 0.92, 1.0], 0.92);
      const crownB = sphere(0.62, crownColor, 9, [1.0, 0.85, 1.0], 0.92);
      crownA.position.set(x, 1.82, z);
      crownB.position.set(x + side * 0.45, 1.62, z + 0.08);
      scene.add(trunk, crownA, crownB);
    }

    for (let i = 0; i < 10; i += 1) {
      const cloud = new THREE.Group();
      const cloudMat = standardMaterial("#ffffff", 1);
      for (let c = 0; c < 3; c += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.0 - c * 0.12, 9, 6), cloudMat.clone());
        puff.scale.set(1.4, 0.7, 0.65);
        puff.position.set(c * 1.15, c === 1 ? 0.25 : 0, 0);
        cloud.add(puff);
      }
      cloud.position.set((i % 2 ? 1 : -1) * (12 + (i % 3) * 7), 11 + (i % 4) * 1.8, 2 - i * 11);
      scene.add(cloud);
    }

    const columns = Math.max(1, Math.floor((trackWidth - 2.2) / Math.max(0.78, duckScale * 1.65)));
    const racers: Racer[] = names.map((name, index) => {
      const rig = createDuck(duckScale, index, detailedDucks);
      const row = Math.floor(index / columns);
      const col = index % columns;
      const usedCols = Math.min(columns, count - row * columns);
      const xGap = (trackWidth - 2) / Math.max(1, usedCols);
      const x = -trackWidth / 2 + 1 + xGap * (col + 0.5);
      const z = 2.2 + row * Math.max(0.78, duckScale * 1.7);
      rig.group.position.set(x, 0, z);
      rig.group.rotation.y = Math.PI;
      scene.add(rig.group);
      return {
        index,
        name,
        rig,
        progress: 0,
        baseSpeed: 2.45 + Math.random() * 0.65,
        targetX: x,
        startZ: z,
        finishDistance: z - finishZ,
        phase: Math.random() * Math.PI * 2,
        finishedAt: null,
        boostUntil: 0,
        slowUntil: 0,
        napUntil: 0,
        ufoUntil: 0,
        dramaUntil: 0,
        effectText: "",
      };
    });
    racersRef.current = racers;

    const labels = racers.map((racer) => {
      const element = document.createElement("div");
      element.className = "duck-name-tag";
      element.textContent = racer.name;
      labelsLayer.appendChild(element);
      return element;
    });

    const effectLabels = racers.map(() => {
      const element = document.createElement("div");
      element.className = "duck-effect-tag";
      labelsLayer.appendChild(element);
      return element;
    });

    const clock = new THREE.Clock();
    let animation = 0;
    let lastHudAt = 0;
    let visibleIndexes = new Set<number>();

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const projectLabel = (element: HTMLDivElement, position: THREE.Vector3, offsetY: number, visible: boolean) => {
      if (!visible) {
        element.style.opacity = "0";
        return;
      }
      const p = position.clone();
      p.y += offsetY;
      p.project(camera);
      if (p.z < -1 || p.z > 1 || Math.abs(p.x) > 1.15 || Math.abs(p.y) > 1.15) {
        element.style.opacity = "0";
        return;
      }
      const x = (p.x * 0.5 + 0.5) * mount.clientWidth;
      const y = (-p.y * 0.5 + 0.5) * mount.clientHeight;
      const depthScale = THREE.MathUtils.clamp(1.18 - p.z * 0.18, 0.9, 1.16);
      element.style.opacity = "1";
      element.style.transform =
        "translate3d(" + x + "px," + y + "px,0) translate(-50%,-100%) scale(" + depthScale + ")";
    };

    const finishRaceIfNeeded = () => {
      if (finishOrderRef.current.length < racers.length) return;
      runningRef.current = false;
      setRunning(false);
      const final = [...finishOrderRef.current];
      setResult(final);
      setWinnerTitle(WINNER_TITLES[randomInt(WINNER_TITLES.length)]);
      setEventText(null);
      focusIndexRef.current = null;
      if (!mutedRef.current) playRaceSound("finish");
    };

    const animate = () => {
      const dt = Math.min(0.035, clock.getDelta());
      const now = performance.now();

      waterMaterial.opacity = 0.84 + Math.sin(now * 0.0014) * 0.04;

      if (runningRef.current) {
        const elapsed = now - startedAtRef.current;
        const finalSprint = racers.some((racer) => racer.progress / racer.finishDistance > 0.87);

        if (!finalSprint && elapsed > nextEventAtRef.current) {
          triggerEvent(now);
          nextEventAtRef.current = elapsed + 4600 + Math.random() * 2400;
        }

        const targetOrder = targetOrderRef.current;
        const targetRank = new Map(targetOrder.map((index, rank) => [index, rank]));

        racers.forEach((racer) => {
          if (racer.finishedAt !== null) return;

          const plannedRank = targetRank.get(racer.index) ?? racers.length;
          let multiplier = plannedRank === 0 ? 1.08 : plannedRank === 1 ? 1.045 : plannedRank === 2 ? 1.025 : 1;
          if (now < racer.boostUntil) multiplier *= 1.65;
          if (now < racer.slowUntil) multiplier *= 0.42;
          if (now < racer.napUntil) multiplier = 0.05;
          if (now < racer.dramaUntil) multiplier = 0.14;
          if (now < racer.ufoUntil) multiplier *= 0.22;

          if (finalSprint) {
            if (plannedRank === 0) multiplier *= 2.45;
            else if (plannedRank === 1) multiplier *= 1.32;
            else if (plannedRank === 2) multiplier *= 1.12;
            else multiplier *= THREE.MathUtils.clamp(0.92 - plannedRank * 0.004, 0.68, 0.9);
            racer.effectText = plannedRank === 0 ? "🔥 HÀO QUANG NHÂN VẬT CHÍNH" : racer.effectText;
          }

          const terrainZ = racer.startZ - racer.progress;
          if (terrainZ < -22 && terrainZ > -32) multiplier *= 0.84;
          if (terrainZ < -47 && terrainZ > -56) multiplier *= 0.91;

          racer.progress += racer.baseSpeed * multiplier * dt;
          racer.phase += dt * (8.2 + racer.baseSpeed * 1.6) * Math.max(0.15, multiplier);

          const airborne = now < racer.ufoUntil;
          animateDuck(racer.rig, racer.phase, Math.min(1.5, multiplier), airborne);

          const weave = Math.sin(racer.phase * 0.22 + racer.index) * Math.min(0.38, trackWidth / 50);
          racer.rig.group.position.x = THREE.MathUtils.lerp(racer.rig.group.position.x, racer.targetX + weave, dt * 2.4);
          racer.rig.group.position.z = racer.startZ - racer.progress;

          const stepBounce = Math.abs(Math.sin(racer.phase * 2)) * 0.075 * Math.min(1.2, multiplier);
          racer.rig.group.position.y = stepBounce;
          const squash = 1 - stepBounce * 0.16;
          racer.rig.body.scale.set(1 + stepBounce * 0.04, squash, 1 + stepBounce * 0.03);

          if (airborne) {
            racer.rig.group.position.y += 2.2 + Math.sin(now * 0.009) * 0.7;
            racer.rig.group.rotation.y += dt * 3.5;
          } else {
            racer.rig.group.rotation.y = Math.PI + weave * 0.2;
          }

          if (racer.progress >= racer.finishDistance && racer.finishedAt === null) {
            racer.finishedAt = now;
            finishOrderRef.current.push({ index: racer.index, name: racer.name });
            racer.effectText = finishOrderRef.current.length <= 3 ? "🏁 #" + finishOrderRef.current.length : "🏁";
          }
        });

        if (finalSprint && !finalSprintShownRef.current) {
          finalSprintShownRef.current = true;
          setEventText({ title: "CHẶNG CUỐI — KHÔNG AI ĐƯỢC TIN AI!", subtitle: "Drama tạm dừng. Tất cả nước rút!", emoji: "🔥" });
          window.setTimeout(() => setEventText(null), 2300);
        }

        finishRaceIfNeeded();
      } else {
        racers.forEach((racer) => {
          racer.phase += dt * 2.0;
          animateDuck(racer.rig, racer.phase, 0.24, false);
          racer.rig.group.position.y = Math.sin(racer.phase * 0.65 + racer.index) * 0.025;
        });
      }

      const active = racers.filter((racer) => racer.finishedAt === null);
      const sortedActive = [...active].sort(
        (a, b) => b.progress / b.finishDistance - a.progress / a.finishDistance,
      );
      const leader = sortedActive[0] ?? racers[0];

      if (leader) {
        const focusRacer = focusIndexRef.current !== null
          ? racers.find((racer) => racer.index === focusIndexRef.current)
          : undefined;
        if (focusRacer && now < focusUntilRef.current) {
          const cinematicCamera = new THREE.Vector3(
            focusRacer.rig.group.position.x * 0.35,
            6.5,
            focusRacer.rig.group.position.z + 10.5,
          );
          camera.position.lerp(cinematicCamera, Math.min(1, dt * 2.8));
          camera.lookAt(focusRacer.rig.group.position.x, 1.35, focusRacer.rig.group.position.z - 1.5);
        } else {
          focusIndexRef.current = null;
          const topGroup = sortedActive.slice(0, Math.min(6, sortedActive.length));
          const groupZ = topGroup.length
            ? topGroup.reduce((sum, racer) => sum + racer.rig.group.position.z, 0) / topGroup.length
            : leader.rig.group.position.z;
          const progressSpread = topGroup.length > 1
            ? Math.max(...topGroup.map((racer) => racer.progress / racer.finishDistance))
              - Math.min(...topGroup.map((racer) => racer.progress / racer.finishDistance))
            : 0;
          const followZ = THREE.MathUtils.clamp(groupZ + 18 + progressSpread * 18, -TRACK_LENGTH + 18, 25);
          const targetCamera = new THREE.Vector3(0, 10.2 + Math.min(4, progressSpread * 8), followZ);
          if (runningRef.current && leader.progress / leader.finishDistance > 0.82) {
            targetCamera.y = 7.8;
            targetCamera.z = followZ + 1.8;
          }
          camera.position.lerp(targetCamera, Math.min(1, dt * 1.55));
          camera.lookAt(0, 1.35, groupZ - 7.2);
        }
      }

      racers.forEach((racer, index) => {
        const showName = count <= 36
          || visibleIndexes.has(racer.index)
          || racer.effectText.length > 0
          || racer.finishedAt !== null && finishOrderRef.current.findIndex((item) => item.index === racer.index) < 3;
        projectLabel(labels[index], racer.rig.group.position, duckScale * 4.15, showName);
        effectLabels[index].textContent = racer.effectText;
        if (racer.effectText) projectLabel(effectLabels[index], racer.rig.group.position, duckScale * 5.35, true);
        else effectLabels[index].style.opacity = "0";

        if (
          racer.effectText &&
          now > Math.max(racer.boostUntil, racer.slowUntil, racer.napUntil, racer.ufoUntil, racer.dramaUntil) &&
          !racer.effectText.startsWith("🏁") &&
          !racer.effectText.includes("HÀO QUANG")
        ) {
          racer.effectText = "";
        }
      });

      if (now - lastHudAt > 420) {
        lastHudAt = now;
        const ordered = [...racers].sort((a, b) => {
          if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
          if (a.finishedAt !== null) return -1;
          if (b.finishedAt !== null) return 1;
          return b.progress / b.finishDistance - a.progress / a.finishDistance;
        });
        const top = ordered.slice(0, 5);
        visibleIndexes = new Set(ordered.slice(0, count > 70 ? 6 : 10).map((racer) => racer.index));
        setRankings(top.map((racer) => racer.name));
      }

      renderer.render(scene, camera);
      animation = window.requestAnimationFrame(animate);
    };

    animation = window.requestAnimationFrame(animate);

    return () => {
      runningRef.current = false;
      window.cancelAnimationFrame(animation);
      observer.disconnect();
      labels.forEach((label) => label.remove());
      effectLabels.forEach((label) => label.remove());
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      racersRef.current = [];
    };
  }, [entered, names, triggerEvent]);

  const raceAgain = useCallback(() => {
    setResult([]);
    setRankings([]);
    window.setTimeout(() => startRace(), 80);
  }, [startRace]);

  if (!entered) {
    const count = parseNames(draft).length;
    return (
      <main className="duck-setup-shell">
        <Link className="game-back-link" href="/">← Game Hub</Link>
        <section className="duck-setup-card">
          <div className="duck-setup-title">
            <span>🦆</span>
            <div>
              <p>RANDOM NAME · DUCK RACE 3D</p>
              <h1>Đại Loạn Ao Làng</h1>
              <small>Đua vịt 3D hoạt hình — càng đông càng loạn.</small>
            </div>
          </div>
          <div className="random-input-heading">
            <div><b>Danh sách học sinh</b><span>Mỗi dòng một tên hoặc dán nguyên cột</span></div>
            <strong>{count}</strong>
          </div>
          <textarea
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            placeholder={"[Học sinh 1]\n[Học sinh 2]\n[Học sinh 3]\n[Học sinh 4]\n..."}
            value={draft}
          />
          <div className="duck-setup-notes">
            <span>✨ Vịt tròn 3D</span>
            <span>🎥 Camera bám nhóm dẫn đầu</span>
            <span>👥 Tự tối ưu lớp đông</span>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="duck-enter-button" onClick={enterRace} type="button">
            Vào trường đua <span>→</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="duck-game-shell">
      <header className="duck-topbar">
        <Link href="/">GAME HUB</Link>
        <div>
          <b>🦆 Đại Loạn Ao Làng</b>
          <span>{names.length} vịt tham chiến</span>
        </div>
        <div className="duck-top-actions">
          <button onClick={() => setMuted((current) => !current)} type="button">{muted ? "🔇" : "🔊"}</button>
          <button
            onClick={() => {
              const stage = mountRef.current?.parentElement;
              if (!stage) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void stage.requestFullscreen();
            }}
            type="button"
          >
            ⛶ Toàn màn hình
          </button>
          <button disabled={running} onClick={() => setEntered(false)} type="button">Sửa danh sách</button>
        </div>
      </header>

      <section className="duck-race-stage">
        <div className="duck-three-scene" ref={mountRef} />
        <div className="duck-label-layer" ref={labelsRef} />

        <aside className="duck-ranking">
          <span>TOP 5</span>
          {rankings.length === 0 && <small>Chưa xuất phát</small>}
          {rankings.map((name, index) => <div key={name + index}><b>{index + 1}</b><em>{name}</em></div>)}
        </aside>

        {!running && result.length === 0 && (
          <div className="duck-start-panel">
            <span>🦆</span>
            <h2>Sẵn sàng đại loạn?</h2>
            <p>{names.length} con vịt đang chờ hiệu lệnh.</p>
            <button onClick={startRace} type="button">BẮT ĐẦU ĐUA!</button>
          </div>
        )}

        {eventText && running && (
          <div className="duck-event-banner" key={eventText.title}>
            <span>{eventText.emoji}</span>
            <div><strong>{eventText.title}</strong><small>{eventText.subtitle}</small></div>
          </div>
        )}

        {running && <div className="duck-live-pill"><i /> CUỘC ĐUA ĐANG DIỄN RA</div>}

        {result.length > 0 && (
          <div className="duck-result-screen" role="dialog" aria-modal="true">
            <div className="duck-result-copy">
              <p>🏆 NHÀ VÔ ĐỊCH AO LÀNG</p>
              <h2>{result[0]?.name}</h2>
              <strong>{winnerTitle}</strong>
              <div className="duck-podium-list">
                {result.slice(0, 3).map((racer, index) => (
                  <span key={racer.name + index}><b>{["🥇", "🥈", "🥉"][index]}</b>{racer.name}</span>
                ))}
              </div>
              <div className="duck-result-actions">
                <button onClick={raceAgain} type="button">Đua lại 🔁</button>
                <button onClick={() => setEntered(false)} type="button">Đổi danh sách</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
