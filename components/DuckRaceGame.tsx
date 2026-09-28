"use client";

import Link from "next/link";
import * as THREE from "three";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lunix-duck-race-class";
const TRACK_LENGTH = 82;

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

type DuckRig = {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  head: THREE.Group;
};

type Racer = {
  index: number;
  name: string;
  rig: DuckRig;
  progress: number;
  baseSpeed: number;
  targetX: number;
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

function box(
  width: number,
  height: number,
  depth: number,
  color: THREE.ColorRepresentation,
  roughness = 0.82,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.01 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createDuck(scale = 1): DuckRig {
  const group = new THREE.Group();

  const body = box(1.35, 0.95, 1.75, "#f7cf42");
  body.position.y = 1.2;
  group.add(body);

  const chest = box(1.08, 0.58, 0.7, "#ffe475");
  chest.position.set(0, 1.1, 0.86);
  group.add(chest);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.2, 0.5);
  const head = box(1.05, 1.0, 1.0, "#f9d84f");
  headGroup.add(head);

  const beak = box(0.68, 0.25, 0.48, "#f28a2b");
  beak.position.set(0, -0.06, 0.7);
  headGroup.add(beak);

  const leftEye = box(0.13, 0.16, 0.08, "#17152b", 1);
  const rightEye = box(0.13, 0.16, 0.08, "#17152b", 1);
  leftEye.position.set(-0.24, 0.2, 0.52);
  rightEye.position.set(0.24, 0.2, 0.52);
  headGroup.add(leftEye, rightEye);
  group.add(headGroup);

  const leftWing = box(0.25, 0.62, 1.05, "#e5b92f");
  const rightWing = box(0.25, 0.62, 1.05, "#e5b92f");
  leftWing.position.set(-0.78, 1.26, 0);
  rightWing.position.set(0.78, 1.26, 0);
  group.add(leftWing, rightWing);

  const leftLeg = box(0.18, 0.48, 0.18, "#e97d24");
  const rightLeg = box(0.18, 0.48, 0.18, "#e97d24");
  leftLeg.position.set(-0.34, 0.4, 0.1);
  rightLeg.position.set(0.34, 0.4, 0.1);
  group.add(leftLeg, rightLeg);

  const leftFoot = box(0.4, 0.12, 0.48, "#e97d24");
  const rightFoot = box(0.4, 0.12, 0.48, "#e97d24");
  leftFoot.position.set(-0.34, 0.13, 0.2);
  rightFoot.position.set(0.34, 0.13, 0.2);
  group.add(leftFoot, rightFoot);

  group.scale.setScalar(scale);
  return { group, leftWing, rightWing, leftLeg, rightLeg, head: headGroup };
}

function animateDuck(rig: DuckRig, phase: number, speed = 1) {
  const swing = Math.sin(phase) * 0.65 * speed;
  rig.leftWing.rotation.z = 0.12 + Math.sin(phase * 1.35) * 0.22 * speed;
  rig.rightWing.rotation.z = -0.12 - Math.sin(phase * 1.35) * 0.22 * speed;
  rig.leftLeg.rotation.x = swing;
  rig.rightLeg.rotation.x = -swing;
  rig.head.rotation.y = Math.sin(phase * 0.35) * 0.1;
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
  const winnerIndexRef = useRef<number | null>(null);
  const targetOrderRef = useRef<number[]>([]);
  const finishOrderRef = useRef<RaceResult[]>([]);
  const nextEventAtRef = useRef(0);
  const lastEventIdRef = useRef("");
  const mutedRef = useRef(false);

  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [entered, setEntered] = useState(false);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [eventText, setEventText] = useState<{ title: string; subtitle: string; emoji: string } | null>(null);
  const [rankings, setRankings] = useState<string[]>([]);
  const [result, setResult] = useState<RaceResult[]>([]);
  const [winnerTitle, setWinnerTitle] = useState("");
  const [raceId, setRaceId] = useState(0);
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
    if (runningRef.current || names.length < 2) return;
    const order = shuffle(names.map((_, index) => index));
    targetOrderRef.current = order;
    winnerIndexRef.current = order[0];
    finishOrderRef.current = [];
    startedAtRef.current = performance.now();
    nextEventAtRef.current = 5200 + Math.random() * 1800;
    lastEventIdRef.current = "";
    racersRef.current.forEach((racer) => {
      racer.progress = 0;
      racer.finishedAt = null;
      racer.boostUntil = 0;
      racer.slowUntil = 0;
      racer.napUntil = 0;
      racer.ufoUntil = 0;
      racer.dramaUntil = 0;
      racer.effectText = "";
      racer.rig.group.position.z = 0;
    });
    runningRef.current = true;
    setRunning(true);
    setResult([]);
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

    const byProgress = [...racers].sort((a, b) => b.progress - a.progress);
    const randomRacer = () => racers[randomInt(racers.length)];

    if (event.id === "bread") {
      const victims = shuffle(racers).slice(0, Math.max(1, Math.ceil(racers.length * 0.18)));
      victims.forEach((racer) => {
        racer.slowUntil = now + 2600;
        racer.effectText = "🥖 Bỏ đua đi ăn";
      });
    }

    if (event.id === "ancestors") {
      const racer = byProgress[byProgress.length - 1];
      racer.boostUntil = now + 3400;
      racer.effectText = "🔥 Ông bà đang gánh";
    }

    if (event.id === "traffic") {
      const racer = byProgress[0];
      racer.slowUntil = now + 2800;
      racer.effectText = "🚨 Tấp vào lề!";
    }

    if (event.id === "ufo") {
      const racer = randomRacer();
      racer.ufoUntil = now + 2400;
      racer.slowUntil = now + 1900;
      racer.effectText = "👽 Đang được UFO chăm sóc";
    }

    if (event.id === "slipper") {
      const racer = randomRacer();
      racer.boostUntil = now + 3600;
      racer.effectText = "🩴 Dép tổ ong +100 uy tín";
    }

    if (event.id === "nap") {
      const racer = randomRacer();
      racer.napUntil = now + 2600;
      racer.effectText = "😴 5 phút nữa chạy";
    }

    if (event.id === "drama") {
      const pair = shuffle(racers).slice(0, 2);
      pair.forEach((racer) => {
        racer.dramaUntil = now + 2200;
        racer.effectText = "💢 Đang cãi nhau";
      });
    }
  }, []);

  useEffect(() => {
    if (!entered || names.length < 2) return;
    const mount = mountRef.current;
    const labelsLayer = labelsRef.current;
    if (!mount || !labelsLayer) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#78c7ef");
    scene.fog = new THREE.Fog("#bce8ff", 38, 120);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 180);
    camera.position.set(0, 12, 24);
    camera.lookAt(0, 1.4, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = names.length <= 55;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "duck-three-canvas";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff9d9", "#618851", 2.8));
    const sun = new THREE.DirectionalLight("#fff4c8", 4.2);
    sun.position.set(-14, 26, 12);
    sun.castShadow = names.length <= 55;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    scene.add(sun);

    const count = names.length;
    const trackWidth = THREE.MathUtils.clamp(13 + Math.sqrt(count) * 1.65, 17, 30);
    const duckScale = count > 70 ? 0.56 : count > 45 ? 0.65 : count > 25 ? 0.76 : 0.88;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 170),
      new THREE.MeshStandardMaterial({ color: "#77a94f", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.06, -35);
    ground.receiveShadow = true;
    scene.add(ground);

    const track = new THREE.Mesh(
      new THREE.PlaneGeometry(trackWidth, TRACK_LENGTH + 18),
      new THREE.MeshStandardMaterial({ color: "#d9b776", roughness: 0.95 }),
    );
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0.02, -TRACK_LENGTH / 2 + 4);
    track.receiveShadow = true;
    scene.add(track);

    const mud = new THREE.Mesh(
      new THREE.PlaneGeometry(trackWidth - 1, 10),
      new THREE.MeshStandardMaterial({ color: "#8a6044", roughness: 1 }),
    );
    mud.rotation.x = -Math.PI / 2;
    mud.position.set(0, 0.035, -26);
    scene.add(mud);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(trackWidth - 1, 9),
      new THREE.MeshStandardMaterial({ color: "#50a9dc", roughness: 0.45, metalness: 0.05 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.04, -49);
    scene.add(water);

    const finishLine = new THREE.Group();
    const finishZ = -TRACK_LENGTH + 5;
    for (let x = -trackWidth / 2; x < trackWidth / 2; x += 1.4) {
      const tile = box(1.4, 0.08, 1.2, Math.round((x + trackWidth / 2) / 1.4) % 2 ? "#ffffff" : "#17152b");
      tile.position.set(x + 0.7, 0.08, finishZ);
      finishLine.add(tile);
    }
    scene.add(finishLine);

    const archLeft = box(0.5, 5.2, 0.5, "#d63b38");
    const archRight = box(0.5, 5.2, 0.5, "#d63b38");
    const archTop = box(trackWidth + 1, 0.65, 0.7, "#d63b38");
    archLeft.position.set(-trackWidth / 2 - 0.5, 2.6, finishZ);
    archRight.position.set(trackWidth / 2 + 0.5, 2.6, finishZ);
    archTop.position.set(0, 5.1, finishZ);
    scene.add(archLeft, archRight, archTop);

    const signMaterial = new THREE.MeshStandardMaterial({ color: "#ffdf4b", roughness: 0.8 });
    const startBar = new THREE.Mesh(new THREE.BoxGeometry(trackWidth + 1, 0.35, 0.5), signMaterial);
    startBar.position.set(0, 4.2, 3.8);
    scene.add(startBar);
    const startLeft = box(0.45, 4.2, 0.45, "#ffdf4b");
    const startRight = box(0.45, 4.2, 0.45, "#ffdf4b");
    startLeft.position.set(-trackWidth / 2 - 0.4, 2.1, 3.8);
    startRight.position.set(trackWidth / 2 + 0.4, 2.1, 3.8);
    scene.add(startLeft, startRight);

    for (let i = 0; i < 42; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 5 - (i / 42) * (TRACK_LENGTH + 15);
      const trunk = box(0.28, 1.2, 0.28, "#7b4c2d");
      trunk.position.set(side * (trackWidth / 2 + 2.5 + (i % 3) * 0.8), 0.6, z);
      const crown = box(1.3, 1.0, 1.3, i % 4 === 0 ? "#5c9b45" : "#6caf51");
      crown.position.set(trunk.position.x, 1.55, z);
      scene.add(trunk, crown);
    }

    const laneGap = Math.min(1.5, (trackWidth - 2.2) / Math.max(1, count));
    const racers: Racer[] = names.map((name, index) => {
      const rig = createDuck(duckScale);
      const columns = Math.max(1, Math.floor((trackWidth - 2) / Math.max(0.9, duckScale * 1.9)));
      const row = Math.floor(index / columns);
      const col = index % columns;
      const usedCols = Math.min(columns, count - row * columns);
      const xGap = (trackWidth - 2) / Math.max(1, usedCols);
      const x = -trackWidth / 2 + 1 + xGap * (col + 0.5);
      const z = 2.2 + row * 1.35;
      rig.group.position.set(x, 0, z);
      scene.add(rig.group);
      return {
        index,
        name,
        rig,
        progress: 0,
        baseSpeed: 2.45 + Math.random() * 0.65,
        targetX: x,
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

    const projectLabel = (element: HTMLDivElement, position: THREE.Vector3, offsetY: number) => {
      const p = position.clone();
      p.y += offsetY;
      p.project(camera);
      if (p.z < -1 || p.z > 1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) {
        element.style.opacity = "0";
        return;
      }
      const x = (p.x * 0.5 + 0.5) * mount.clientWidth;
      const y = (-p.y * 0.5 + 0.5) * mount.clientHeight;
      element.style.opacity = "1";
      element.style.transform = "translate3d(" + x + "px," + y + "px,0) translate(-50%,-100%)";
    };

    const finishRaceIfNeeded = () => {
      if (finishOrderRef.current.length < racers.length) return;
      runningRef.current = false;
      setRunning(false);
      const final = [...finishOrderRef.current];
      setResult(final);
      setWinnerTitle(WINNER_TITLES[randomInt(WINNER_TITLES.length)]);
      setEventText(null);
      if (!mutedRef.current) playRaceSound("finish");
    };

    const animate = () => {
      const dt = Math.min(0.035, clock.getDelta());
      const now = performance.now();

      if (runningRef.current) {
        const elapsed = now - startedAtRef.current;
        const finalSprint = racers.some((racer) => racer.progress > TRACK_LENGTH * 0.87);

        if (!finalSprint && elapsed > nextEventAtRef.current) {
          triggerEvent(now);
          nextEventAtRef.current = elapsed + 4600 + Math.random() * 2400;
        }

        const targetOrder = targetOrderRef.current;
        const targetRank = new Map(targetOrder.map((index, rank) => [index, rank]));

        racers.forEach((racer) => {
          if (racer.finishedAt !== null) return;

          let multiplier = 1;
          if (now < racer.boostUntil) multiplier *= 1.65;
          if (now < racer.slowUntil) multiplier *= 0.42;
          if (now < racer.napUntil) multiplier = 0.05;
          if (now < racer.dramaUntil) multiplier = 0.14;
          if (now < racer.ufoUntil) multiplier *= 0.22;

          if (finalSprint) {
            const rank = targetRank.get(racer.index) ?? racers.length;
            if (rank === 0) multiplier *= 1.85;
            else if (rank === 1) multiplier *= 1.34;
            else if (rank === 2) multiplier *= 1.17;
            else multiplier *= THREE.MathUtils.clamp(1.04 - rank * 0.006, 0.82, 1.02);
            racer.effectText = rank === 0 ? "🔥 HÀO QUANG NHÂN VẬT CHÍNH" : "";
          }

          const terrainZ = -racer.progress;
          if (terrainZ < -21 && terrainZ > -31) multiplier *= 0.84;
          if (terrainZ < -45 && terrainZ > -54) multiplier *= 0.91;

          racer.progress += racer.baseSpeed * multiplier * dt;
          racer.phase += dt * (8.2 + racer.baseSpeed * 1.6) * Math.max(0.15, multiplier);
          animateDuck(racer.rig, racer.phase, Math.min(1.3, multiplier));

          const weave = Math.sin(racer.phase * 0.22 + racer.index) * Math.min(0.38, trackWidth / 50);
          racer.rig.group.position.x = THREE.MathUtils.lerp(racer.rig.group.position.x, racer.targetX + weave, dt * 2.4);
          racer.rig.group.position.z = 2.2 - racer.progress;
          racer.rig.group.position.y = Math.abs(Math.sin(racer.phase * 2)) * 0.08;

          if (now < racer.ufoUntil) {
            racer.rig.group.position.y += 2.2 + Math.sin(now * 0.009) * 0.7;
            racer.rig.group.rotation.y += dt * 3.5;
          } else {
            racer.rig.group.rotation.y = weave * 0.25;
          }

          if (racer.progress >= TRACK_LENGTH - 5 && racer.finishedAt === null) {
            racer.finishedAt = now;
            finishOrderRef.current.push({ index: racer.index, name: racer.name });
            racer.effectText = finishOrderRef.current.length <= 3 ? "🏁 #" + finishOrderRef.current.length : "🏁";
          }
        });

        if (finalSprint && eventText === null) {
          setEventText({ title: "CHẶNG CUỐI — KHÔNG AI ĐƯỢC TIN AI!", subtitle: "Drama tạm dừng. Tất cả nước rút!", emoji: "🔥" });
          window.setTimeout(() => setEventText(null), 2300);
        }

        finishRaceIfNeeded();
      }

      const active = racers.filter((racer) => racer.finishedAt === null);
      const leader = active.length
        ? active.reduce((best, racer) => racer.progress > best.progress ? racer : best, active[0])
        : racers[0];

      if (leader) {
        const followZ = THREE.MathUtils.clamp(leader.rig.group.position.z + 18, -TRACK_LENGTH + 18, 24);
        const targetCamera = new THREE.Vector3(0, 11.5, followZ);
        if (runningRef.current && leader.progress > TRACK_LENGTH * 0.82) {
          targetCamera.y = 8.2;
          targetCamera.z = followZ + 2;
        }
        camera.position.lerp(targetCamera, Math.min(1, dt * 1.45));
        camera.lookAt(0, 1.4, leader.rig.group.position.z - 8);
      }

      racers.forEach((racer, index) => {
        projectLabel(labels[index], racer.rig.group.position, duckScale * 4.2);
        effectLabels[index].textContent = racer.effectText;
        if (racer.effectText) projectLabel(effectLabels[index], racer.rig.group.position, duckScale * 5.4);
        else effectLabels[index].style.opacity = "0";

        if (
          racer.effectText &&
          performance.now() > Math.max(racer.boostUntil, racer.slowUntil, racer.napUntil, racer.ufoUntil, racer.dramaUntil) &&
          !racer.effectText.startsWith("🏁") &&
          !racer.effectText.includes("HÀO QUANG")
        ) {
          racer.effectText = "";
        }
      });

      if (now - lastHudAt > 450) {
        lastHudAt = now;
        const top = [...racers]
          .sort((a, b) => {
            if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
            if (a.finishedAt !== null) return -1;
            if (b.finishedAt !== null) return 1;
            return b.progress - a.progress;
          })
          .slice(0, 5)
          .map((racer) => racer.name);
        setRankings(top);
      }

      renderer.render(scene, camera);
      animation = window.requestAnimationFrame(animate);
    };

    animation = window.requestAnimationFrame(animate);

    return () => {
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
    };
  }, [entered, names, raceId, triggerEvent]);

  const raceAgain = useCallback(() => {
    setResult([]);
    setRankings([]);
    setRaceId((value) => value + 1);
    window.setTimeout(() => startRace(), 100);
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
              <small>Không phải con vịt nhanh nhất sẽ thắng.</small>
            </div>
          </div>
          <div className="random-input-heading">
            <div><b>Danh sách học sinh</b><span>Mỗi dòng một tên hoặc dán nguyên cột</span></div>
            <strong>{count}</strong>
          </div>
          <textarea
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            placeholder={"Minh Triết\nGia Vỹ\nNhất Phi\nNgọc Anh\n..."}
            value={draft}
          />
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

        {running && (
          <div className="duck-live-pill"><i /> CUỘC ĐUA ĐANG DIỄN RA</div>
        )}

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
