"use client";

import Link from "next/link";
import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "lunix-random-name-class";
const ARENA_RADIUS = 16.2;
const TEACHER_MOVE_SPEED = 5.2;

const FUNNY_LINES = [
  "Ủa thầy/cô bịt mắt thiệt không vậy? 😭",
  "Em đã cố hòa vào đám đông nhưng bất thành!",
  "Kế hoạch đào tẩu chính thức phá sản.",
  "Yêu cầu VAR! Em nghi có gian lận!",
  "Chạy hết công suất rồi mà vẫn bị tóm. 🥲",
  "Đồng đội đâu? Sao bỏ tôi lại vậy?",
  "NPC này vừa bị giáo viên phát hiện.",
  "Em nghĩ chúng ta nên thương lượng...",
  "Một phút mặc niệm cho chiến thuật vừa rồi.",
  "Báo động đỏ! Em đã bị bắt sống!",
  "Tưởng thoát rồi, ai ngờ thầy/cô cao tay hơn.",
  "Xin tha, em còn bài tập chưa làm!",
  "Thầy/cô nghe tiếng bước chân của em hả?",
  "Em đứng im mà cũng không thoát được!",
  "Không thể tin được! Em là người được chọn.",
];

type CaughtStudent = {
  index: number;
  name: string;
  quote: string;
};

type VoxelRig = {
  group: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
};

type StudentAgent = {
  index: number;
  name: string;
  rig: VoxelRig;
  velocity: THREE.Vector3;
  wanderTarget: THREE.Vector3;
  nextTurnAt: number;
  phase: number;
  speed: number;
};

function parseNames(value: string) {
  return value
    .split(/[\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function randomPoint(radius = ARENA_RADIUS - 1.2) {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * radius;
  return new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
}

function pickRandomIndex(max: number) {
  if (max <= 1) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return Math.floor((buffer[0] / 4294967296) * max);
  }
  return Math.floor(Math.random() * max);
}

function playCue(kind: "start" | "caught") {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = new AudioContextClass();
    const gain = audio.createGain();
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (kind === "caught" ? 0.78 : 0.5));

    const notes = kind === "caught" ? [210, 150, 92] : [300, 430, 610];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      oscillator.type = kind === "caught" ? "square" : "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime + index * 0.11);
      oscillator.connect(gain);
      oscillator.start(audio.currentTime + index * 0.11);
      oscillator.stop(audio.currentTime + index * 0.11 + 0.2);
    });

    window.setTimeout(() => void audio.close(), 900);
  } catch {
    // Trình duyệt có thể chặn AudioContext trước lần tương tác đầu tiên.
  }
}

function makeBox(
  width: number,
  height: number,
  depth: number,
  color: THREE.ColorRepresentation,
  roughness = 0.78,
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createVoxelCharacter(color: THREE.ColorRepresentation, teacher = false): VoxelRig {
  const group = new THREE.Group();

  const torso = makeBox(1.02, 1.42, 0.66, color);
  torso.position.y = 1.72;
  group.add(torso);

  const head = makeBox(1.05, 1.05, 1.02, teacher ? "#e5aa7c" : "#e9b58b");
  head.position.y = 3.02;
  group.add(head);

  const hair = makeBox(1.08, 0.3, 1.06, teacher ? "#2c1b18" : "#4a3026");
  hair.position.set(0, 3.55, -0.01);
  group.add(hair);

  const leftArm = makeBox(0.34, 1.28, 0.42, color);
  const rightArm = makeBox(0.34, 1.28, 0.42, color);
  leftArm.position.set(-0.72, 1.74, 0);
  rightArm.position.set(0.72, 1.74, 0);
  group.add(leftArm, rightArm);

  const leftLeg = makeBox(0.39, 1.18, 0.48, teacher ? "#313447" : "#353a50");
  const rightLeg = makeBox(0.39, 1.18, 0.48, teacher ? "#313447" : "#353a50");
  leftLeg.position.set(-0.27, 0.43, 0);
  rightLeg.position.set(0.27, 0.43, 0);
  group.add(leftLeg, rightLeg);

  const leftEye = makeBox(0.13, 0.13, 0.07, "#17152b", 1);
  const rightEye = makeBox(0.13, 0.13, 0.07, "#17152b", 1);
  leftEye.position.set(-0.22, 3.08, 0.535);
  rightEye.position.set(0.22, 3.08, 0.535);
  group.add(leftEye, rightEye);

  if (teacher) {
    const blindfold = makeBox(1.15, 0.28, 0.09, "#17152b", 0.9);
    blindfold.position.set(0, 3.08, 0.57);
    group.add(blindfold);

    const knot = makeBox(0.34, 0.16, 0.12, "#ff5d52", 0.8);
    knot.position.set(0.63, 3.07, 0.51);
    knot.rotation.z = -0.45;
    group.add(knot);
  }

  group.scale.setScalar(teacher ? 1.04 : 0.7);
  return { group, leftArm, rightArm, leftLeg, rightLeg };
}

function animateWalk(rig: VoxelRig, phase: number, intensity = 1) {
  const swing = Math.sin(phase) * 0.7 * intensity;
  rig.leftArm.rotation.x = swing;
  rig.rightArm.rotation.x = -swing;
  rig.leftLeg.rotation.x = -swing * 0.75;
  rig.rightLeg.rotation.x = swing * 0.75;
}

export function RandomNameGame() {
  const sceneMountRef = useRef<HTMLDivElement | null>(null);
  const labelLayerRef = useRef<HTMLDivElement | null>(null);
  const huntingRef = useRef(false);
  const targetIndexRef = useRef<number | null>(null);
  const huntStartedAtRef = useRef(0);
  const caughtRef = useRef<CaughtStudent | null>(null);
  const caughtIndexesRef = useRef<number[]>([]);
  const mutedRef = useRef(false);
  const noRepeatRef = useRef(true);

  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [hunting, setHunting] = useState(false);
  const [caught, setCaught] = useState<CaughtStudent | null>(null);
  const [caughtIndexes, setCaughtIndexes] = useState<number[]>([]);
  const [noRepeat, setNoRepeat] = useState(true);
  const [muted, setMuted] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [huntRound, setHuntRound] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const saved = JSON.parse(stored) as string[];
      if (Array.isArray(saved)) {
        const clean = saved.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
        setDraft(clean.join("\n"));
      }
    } catch {
      // Bỏ qua dữ liệu localStorage hỏng.
    }
  }, []);

  useEffect(() => {
    caughtRef.current = caught;
  }, [caught]);

  useEffect(() => {
    caughtIndexesRef.current = caughtIndexes;
  }, [caughtIndexes]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    noRepeatRef.current = noRepeat;
  }, [noRepeat]);

  const studentColors = useMemo(
    () => names.map((name, index) => {
      const hue = (hash(name + ":" + index) + index * 43) % 360;
      return new THREE.Color("hsl(" + hue + " 68% 57%)");
    }),
    [names],
  );

  const beginGame = useCallback(() => {
    const parsed = parseNames(draft);
    if (parsed.length === 0) {
      setError("Hãy nhập ít nhất một tên học sinh.");
      return;
    }

    setError("");
    setNames(parsed);
    setCaught(null);
    setCaughtIndexes([]);
    setStarted(true);
    huntingRef.current = false;
    targetIndexRef.current = null;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Game vẫn chạy nếu trình duyệt chặn localStorage.
    }
  }, [draft]);

  const finishCatch = useCallback((index: number) => {
    if (caughtRef.current) return;
    const result = {
      index,
      name: names[index],
      quote: FUNNY_LINES[pickRandomIndex(FUNNY_LINES.length)],
    };
    huntingRef.current = false;
    targetIndexRef.current = null;
    setHunting(false);
    caughtRef.current = result;
    setCaught(result);
    if (noRepeatRef.current) {
      setCaughtIndexes((current) => current.includes(index) ? current : [...current, index]);
    }
    if (!mutedRef.current) playCue("caught");
  }, [names]);

  const startHunt = useCallback(() => {
    if (huntingRef.current || names.length === 0 || caughtRef.current) return;

    let candidates = names.map((_, index) => index);
    if (noRepeat) {
      candidates = candidates.filter((index) => !caughtIndexes.includes(index));
      if (candidates.length === 0) {
        caughtIndexesRef.current = [];
        setCaughtIndexes([]);
        candidates = names.map((_, index) => index);
      }
    }

    if (candidates.length === 0) return;

    targetIndexRef.current = null;
    huntingRef.current = true;
    huntStartedAtRef.current = performance.now();
    setHunting(true);
    setHuntRound((value) => value + 1);
    if (!muted) playCue("start");
  }, [caughtIndexes, muted, names, noRepeat]);

  const closeCaught = useCallback(() => {
    caughtRef.current = null;
    setCaught(null);
  }, []);

  const restoreCaught = useCallback(() => {
    if (!caught) return;
    setCaughtIndexes((current) => current.filter((index) => index !== caught.index));
    caughtRef.current = null;
    setCaught(null);
  }, [caught]);

  const huntAgain = useCallback(() => {
    caughtRef.current = null;
    setCaught(null);
    window.setTimeout(() => startHunt(), 80);
  }, [startHunt]);

  useEffect(() => {
    if (!started || names.length === 0) return;
    const mount = sceneMountRef.current;
    const labelLayer = labelLayerRef.current;
    if (!mount || !labelLayer) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#251e3d");
    scene.fog = new THREE.Fog("#251e3d", 34, 66);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 22.5, 31);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "random-three-canvas";
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#fff2c2", "#2b2142", 2.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#fff5dc", 4.2);
    keyLight.position.set(8, 18, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -24;
    keyLight.shadow.camera.right = 24;
    keyLight.shadow.camera.top = 24;
    keyLight.shadow.camera.bottom = -24;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight("#ff7f50", 45, 34, 2);
    rimLight.position.set(-10, 6, -8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({ color: "#30254c", roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.72;
    floor.receiveShadow = true;
    scene.add(floor);

    const arena = new THREE.Mesh(
      new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 0.72, 72),
      new THREE.MeshStandardMaterial({ color: "#e98732", roughness: 0.82 }),
    );
    arena.position.y = -0.34;
    arena.receiveShadow = true;
    scene.add(arena);

    const innerArena = new THREE.Mesh(
      new THREE.CylinderGeometry(ARENA_RADIUS - 0.45, ARENA_RADIUS - 0.45, 0.09, 72),
      new THREE.MeshStandardMaterial({ color: "#f6b24e", roughness: 0.86 }),
    );
    innerArena.position.y = 0.065;
    innerArena.receiveShadow = true;
    scene.add(innerArena);


    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const radius = ARENA_RADIUS + 4.2 + (index % 3) * 0.7;
      const blockHeight = 0.6 + (index % 4) * 0.28;
      const block = makeBox(0.7 + (index % 2) * 0.35, blockHeight, 0.7, index % 2 ? "#6148b8" : "#d9504c");
      block.position.set(Math.cos(angle) * radius, -0.18 + blockHeight / 2, Math.sin(angle) * radius);
      block.rotation.y = -angle;
      scene.add(block);
    }

    const students: StudentAgent[] = names.map((name, index) => {
      const rig = createVoxelCharacter(studentColors[index], false);
      const position = randomPoint(ARENA_RADIUS - 1.3);
      const avoidCenter = position.length() < 3.1 ? position.normalize().multiplyScalar(4.3) : position;
      rig.group.position.copy(avoidCenter);
      rig.group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(rig.group);

      return {
        index,
        name,
        rig,
        velocity: new THREE.Vector3(),
        wanderTarget: randomPoint(ARENA_RADIUS - 1.5),
        nextTurnAt: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 1.75 + ((hash(name + shuffleSeed) % 105) / 100),
      };
    });

    const teacherRig = createVoxelCharacter("#7357ff", true);
    teacherRig.group.position.set(0, 0, 0);
    scene.add(teacherRig.group);

    const labels = students.map((student) => {
      const element = document.createElement("div");
      element.className = "voxel-name-tag";
      element.textContent = student.name;
      labelLayer.appendChild(element);
      return element;
    });

    const teacherLabel = document.createElement("div");
    teacherLabel.className = "voxel-name-tag teacher-tag";
    teacherLabel.textContent = "GIÁO VIÊN";
    labelLayer.appendChild(teacherLabel);

    const projectLabel = (element: HTMLDivElement, position: THREE.Vector3, yOffset: number, opacity = 1) => {
      const projected = position.clone();
      projected.y += yOffset;
      projected.project(camera);
      const visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.15;
      if (!visible) {
        element.style.opacity = "0";
        return;
      }
      const x = (projected.x * 0.5 + 0.5) * mount.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * mount.clientHeight;
      const distance = camera.position.distanceTo(position);
      const scale = THREE.MathUtils.clamp(22 / distance, 0.65, 1.05);
      element.style.opacity = String(opacity);
      element.style.transform = "translate3d(" + x + "px," + y + "px,0) translate(-50%,-100%) scale(" + scale + ")";
    };

    const spatial = new Map<string, number[]>();
    const cellSize = 1.65;
    const cellKey = (x: number, z: number) => Math.floor(x / cellSize) + ":" + Math.floor(z / cellSize);

    const clock = new THREE.Clock();
    let frame = 0;
    let teacherPhase = 0;
    const keys = new Set<string>();

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.delete(key);
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });

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

    const updateStudents = (dt: number, now: number) => {
      spatial.clear();
      students.forEach((student, index) => {
        const key = cellKey(student.rig.group.position.x, student.rig.group.position.z);
        const bucket = spatial.get(key);
        if (bucket) bucket.push(index);
        else spatial.set(key, [index]);
      });

      students.forEach((student, index) => {
        const position = student.rig.group.position;
        if (now > student.nextTurnAt || position.distanceTo(student.wanderTarget) < 1.1) {
          student.wanderTarget.copy(randomPoint(ARENA_RADIUS - 1.35));
          student.nextTurnAt = now + 900 + Math.random() * 2400;
        }

        const desired = student.wanderTarget.clone().sub(position);
        desired.y = 0;
        if (desired.lengthSq() > 0.01) desired.normalize().multiplyScalar(student.speed);

        const separation = new THREE.Vector3();
        const cx = Math.floor(position.x / cellSize);
        const cz = Math.floor(position.z / cellSize);
        for (let dx = -1; dx <= 1; dx += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            const bucket = spatial.get((cx + dx) + ":" + (cz + dz));
            if (!bucket) continue;
            for (const otherIndex of bucket) {
              if (otherIndex === index) continue;
              const other = students[otherIndex].rig.group.position;
              const distance = position.distanceTo(other);
              if (distance > 0 && distance < 1.15) {
                separation.add(position.clone().sub(other).normalize().multiplyScalar((1.15 - distance) * 2.3));
              }
            }
          }
        }

        const teacherDistance = position.distanceTo(teacherRig.group.position);
        const flee = new THREE.Vector3();
        if (huntingRef.current && teacherDistance < 4.4) {
          flee.copy(position).sub(teacherRig.group.position).setY(0);
          if (flee.lengthSq() > 0.01) flee.normalize().multiplyScalar(3.2 * (1 - teacherDistance / 4.4));
        }

        const radius = Math.hypot(position.x, position.z);
        const boundary = new THREE.Vector3();
        if (radius > ARENA_RADIUS - 1.0) {
          boundary.set(-position.x, 0, -position.z).normalize().multiplyScalar((radius - (ARENA_RADIUS - 1.0)) * 3.8);
        }

        const targetVelocity = desired.add(separation).add(flee).add(boundary);
        const topSpeed = student.speed * (huntingRef.current ? 1.42 : 1.08);
        if (targetVelocity.length() > topSpeed) targetVelocity.setLength(topSpeed);
        student.velocity.lerp(targetVelocity, Math.min(1, dt * 4.2));

        position.x += student.velocity.x * dt;
        position.z += student.velocity.z * dt;

        const distanceFromCenter = Math.hypot(position.x, position.z);
        if (distanceFromCenter > ARENA_RADIUS - 0.75) {
          const scale = (ARENA_RADIUS - 0.75) / distanceFromCenter;
          position.x *= scale;
          position.z *= scale;
          student.wanderTarget.copy(randomPoint(ARENA_RADIUS - 1.8));
        }

        if (student.velocity.lengthSq() > 0.04) {
          student.rig.group.rotation.y = THREE.MathUtils.lerp(
            student.rig.group.rotation.y,
            Math.atan2(student.velocity.x, student.velocity.z),
            Math.min(1, dt * 7),
          );
        }

        student.phase += dt * (6.5 + student.speed * 1.8);
        animateWalk(student.rig, student.phase, Math.min(1, student.velocity.length() / Math.max(0.1, student.speed)));
        student.rig.group.position.y = Math.abs(Math.sin(student.phase * 2)) * 0.035;
      });
    };

    const updateTeacher = (dt: number, now: number) => {
      const position = teacherRig.group.position;
      const velocity = new THREE.Vector3();

      const inputX = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const inputZ = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);

      if (inputX !== 0 || inputZ !== 0) {
        velocity
          .set(inputX, 0, inputZ)
          .normalize()
          .multiplyScalar(TEACHER_MOVE_SPEED * (huntingRef.current ? 1 : 0.82));
      }

      position.x += velocity.x * dt;
      position.z += velocity.z * dt;

      const radius = Math.hypot(position.x, position.z);
      if (radius > ARENA_RADIUS - 0.9) {
        const scale = (ARENA_RADIUS - 0.9) / radius;
        position.x *= scale;
        position.z *= scale;
      }

      if (velocity.lengthSq() > 0.03) {
        teacherRig.group.rotation.y = THREE.MathUtils.lerp(
          teacherRig.group.rotation.y,
          Math.atan2(velocity.x, velocity.z),
          Math.min(1, dt * 10),
        );
      }

      if (huntingRef.current && now - huntStartedAtRef.current > 1150 && !caughtRef.current) {
        let caughtIndex = -1;
        let closestDistance = Infinity;

        students.forEach((student, index) => {
          if (noRepeatRef.current && caughtIndexesRef.current.includes(index)) return;
          const distance = position.distanceTo(student.rig.group.position);
          if (distance < 0.82 && distance < closestDistance) {
            closestDistance = distance;
            caughtIndex = index;
          }
        });

        if (caughtIndex >= 0) finishCatch(caughtIndex);
      }

      teacherPhase += dt * (velocity.lengthSq() > 0.03 ? 12.5 : 3.2);
      animateWalk(
        teacherRig,
        teacherPhase,
        Math.min(1, velocity.length() / TEACHER_MOVE_SPEED),
      );
      teacherRig.group.position.y =
        Math.abs(Math.sin(teacherPhase * 2)) *
        (velocity.lengthSq() > 0.03 ? 0.065 : 0.02);
    };

    const animate = () => {
      const dt = Math.min(0.033, clock.getDelta());
      const now = performance.now();

      updateStudents(dt, now);
      updateTeacher(dt, now);

      const cameraTarget = teacherRig.group.position.clone();
      cameraTarget.y = 1.35;

      const desiredCamera = huntingRef.current
        ? new THREE.Vector3(
            teacherRig.group.position.x * 0.12,
            20.2,
            28.5 + teacherRig.group.position.z * 0.08,
          )
        : new THREE.Vector3(0, 22.5, 31);

      camera.position.lerp(desiredCamera, Math.min(1, dt * 2.5));
      camera.lookAt(cameraTarget);

      students.forEach((student, index) => {
        const faded = noRepeatRef.current && caughtIndexesRef.current.includes(index) ? 0.62 : 1;
        projectLabel(labels[index], student.rig.group.position, 3.15, faded);
      });
      projectLabel(teacherLabel, teacherRig.group.position, 4.1, 1);

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      labels.forEach((label) => label.remove());
      teacherLabel.remove();

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
  }, [finishCatch, names, shuffleSeed, started, studentColors]);

  if (!started) {
    const previewCount = parseNames(draft).length;
    return (
      <main className="random-setup-shell compact">
        <Link className="game-back-link" href="/">← Game Hub</Link>
        <section className="random-setup-card compact">
          <div className="random-input-panel">
            <p className="random-kicker">RANDOM NAME</p>
            <div className="random-input-heading">
              <div>
                <b>Danh sách học sinh</b>
                <span>Mỗi dòng một tên hoặc dán nguyên cột</span>
              </div>
              <strong>{previewCount}</strong>
            </div>
            <textarea
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"Minh Triết\nGia Vỹ\nNhất Phi\nNgọc Anh\n..."}
              value={draft}
            />
            <label className="random-check">
              <input checked={noRepeat} onChange={(event) => setNoRepeat(event.target.checked)} type="checkbox" />
              <span>
                <b>Không lặp tên</b>
                <small>Mỗi học sinh chỉ bị bắt một lần cho đến khi hết lượt.</small>
              </span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="random-start-button" onClick={beginGame} type="button">
              Vào đấu trường <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const caughtCount = noRepeat ? caughtIndexes.length : 0;

  return (
    <main className="random-game-shell three-mode">
      <header className="random-game-topbar">
        <Link href="/">GAME HUB</Link>
        <div>
          <b>Random Name</b>
          <span>{names.length} học sinh {noRepeat ? "· " + caughtCount + " đã được gọi" : ""}</span>
        </div>
        <div className="random-top-actions">
          <button onClick={() => setMuted((current) => !current)} type="button">{muted ? "🔇" : "🔊"}</button>
          <button disabled={hunting} onClick={() => setShuffleSeed((value) => value + 1)} type="button">Đổi vị trí</button>
          <button disabled={hunting} onClick={() => setStarted(false)} type="button">Sửa danh sách</button>
        </div>
      </header>

      <section className="random-arena-wrap three-arena">
        <div className="random-three-scene" ref={sceneMountRef} />
        <div className="random-label-layer" ref={labelLayerRef} />

        <div className="random-control-hint" aria-hidden="true">
          <b>W A S D</b>
          <span>Điều khiển giáo viên</span>
        </div>

        <div className="random-arena-controls">
          <button className="hunt-button" disabled={hunting || Boolean(caught)} onClick={startHunt} type="button">
            {hunting ? "ĐANG BẮT DÊ..." : "🙈 BẮT ĐẦU BỊT MẮT BẮT DÊ"}
          </button>
          {noRepeat && caughtIndexes.length >= names.length && names.length > 0 && (
            <button className="reset-random-button" onClick={() => setCaughtIndexes([])} type="button">
              Làm mới lượt gọi
            </button>
          )}
        </div>

        {hunting && (
          <div className="hunter-announcement" key={huntRound} aria-hidden="true">
            <span>⚠</span>
            <strong>BỊT MẮT BẮT DÊ BẮT ĐẦU!</strong>
            <small>WASD · ĐUỔI BẮT!</small>
          </div>
        )}

        {caught && (
          <div className="caught-cinematic" role="dialog" aria-modal="true" aria-labelledby="caught-name">
            <div className="caught-shard shard-one" />
            <div className="caught-shard shard-two" />
            <div className="caught-shard shard-three" />
            <div className="caught-shard shard-four" />
            <div className="caught-cinematic-copy">
              <span>ĐÃ BỊ TÓM!</span>
              <h2 id="caught-name">{caught.name}</h2>
              <p>“{caught.quote}”</p>
              <div className="caught-actions cinematic-actions">
                <button className="caught-primary" onClick={huntAgain} type="button">Bắt tiếp →</button>
                {noRepeat && <button onClick={restoreCaught} type="button">Cho lại lượt</button>}
                <button onClick={closeCaught} type="button">Đóng</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
