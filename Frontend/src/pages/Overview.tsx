import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { FadeIn } from "../components/effects/FadeIn";

interface GraphNode {
  id: string;
  label: string;
  fullName: string;
  x: number;
  y: number;
  size: number;
  color: string;
  changes: number;
  authors: number;
  floatDuration: number;
}

const NODES: GraphNode[] = [
  { id: "rl", label: "rl.py", fullName: "rate_limiter.py", x: 45, y: 35, size: 48, color: "#F87171", changes: 23, authors: 4, floatDuration: 3.2 },
  { id: "auth", label: "auth.py", fullName: "auth_service.py", x: 25, y: 55, size: 50, color: "#F87171", changes: 47, authors: 6, floatDuration: 4.1 },
  { id: "ctrl", label: "ctrl.js", fullName: "user_controller.js", x: 65, y: 25, size: 40, color: "#FBBF24", changes: 19, authors: 3, floatDuration: 3.7 },
  { id: "up", label: "UP.tsx", fullName: "UserProfile.tsx", x: 70, y: 55, size: 36, color: "#34D399", changes: 12, authors: 2, floatDuration: 4.5 },
  { id: "db", label: "db.py", fullName: "database.py", x: 35, y: 75, size: 32, color: "#34D399", changes: 8, authors: 2, floatDuration: 5.0 },
  { id: "cfg", label: "cfg.ts", fullName: "config.ts", x: 80, y: 40, size: 24, color: "#34D399", changes: 5, authors: 1, floatDuration: 3.4 },
  { id: "mid", label: "mid.py", fullName: "middleware.py", x: 15, y: 30, size: 30, color: "#FBBF24", changes: 14, authors: 3, floatDuration: 4.8 },
  { id: "test", label: "tst.py", fullName: "test_rate.py", x: 55, y: 70, size: 22, color: "#34D399", changes: 4, authors: 1, floatDuration: 3.9 },
  { id: "util", label: "util.js", fullName: "utils.js", x: 50, y: 48, size: 28, color: "#FBBF24", changes: 10, authors: 2, floatDuration: 4.3 },
];

const EDGES: [string, string][] = [
  ["rl", "auth"],
  ["rl", "mid"],
  ["auth", "db"],
  ["auth", "ctrl"],
  ["ctrl", "up"],
  ["ctrl", "cfg"],
  ["up", "util"],
  ["db", "test"],
  ["rl", "test"],
  ["mid", "auth"],
  ["util", "cfg"],
];

const NODE_CLASSES: Record<string, string> = {
  rl: "overview-node overview-node--rl",
  auth: "overview-node overview-node--auth",
  ctrl: "overview-node overview-node--ctrl",
  up: "overview-node overview-node--up",
  db: "overview-node overview-node--db",
  cfg: "overview-node overview-node--cfg",
  mid: "overview-node overview-node--mid",
  test: "overview-node overview-node--test",
  util: "overview-node overview-node--util",
};

const ANTI_PATTERNS = [
  { dot: "bg-gitlore-error", text: "N+1 query", count: 8 },
  { dot: "bg-gitlore-warning", text: "Missing cleanup", count: 3 },
  { dot: "bg-gitlore-warning", text: "Over-fetching", count: 2 },
];

const MOST_CHANGED = [
  { name: "auth_service.py", changes: 47 },
  { name: "rate_limiter.py", changes: 23 },
  { name: "user_controller.js", changes: 19 },
];

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.75;
/** Past this drag distance (px) we treat as a node drag, not a click. */
const NODE_DRAG_CLICK_THRESHOLD_PX = 6;

const initialNodePositions = (): Record<string, { x: number; y: number }> =>
  Object.fromEntries(NODES.map((n) => [n.id, { x: n.x, y: n.y }]));

type NodeDragSession = {
  pointerId: number;
  nodeId: string;
  grabDx: number;
  grabDy: number;
  ox: number;
  oy: number;
  dragged: boolean;
};

const KnowledgeGraph = () => {
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const graphLayerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [positions, setPositions] = useState(initialNodePositions);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragSessionRef = useRef<NodeDragSession | null>(null);
  const suppressNextClickRef = useRef(false);

  scaleRef.current = scale;

  /** Map pointer to graph % coords; accounts for uniform scale(transformOrigin center). */
  const clientToPercent = (clientX: number, clientY: number) => {
    const layer = graphLayerRef.current;
    if (!layer) return { x: 50, y: 50 };
    const w = layer.offsetWidth;
    const h = layer.offsetHeight;
    if (w < 1 || h < 1) return { x: 50, y: 50 };
    const rect = layer.getBoundingClientRect();
    const s = scaleRef.current;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const lx = w / 2 + (clientX - cx) / s;
    const ly = h / 2 + (clientY - cy) / s;
    return { x: (lx / w) * 100, y: (ly / h) * 100 };
  };

  const clampPct = (v: number) => Math.min(96, Math.max(4, v));

  const zoomByFactor = (factor: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * factor));
    scaleRef.current = next;
    setScale(next);
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * factor));
      scaleRef.current = next;
      setScale(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const endNodeDragListeners = (move: (e: PointerEvent) => void, up: (e: PointerEvent) => void) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  };

  const onNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const { x: xPct, y: yPct } = clientToPercent(e.clientX, e.clientY);
    const pos = positions[nodeId];
    const session: NodeDragSession = {
      pointerId: e.pointerId,
      nodeId,
      grabDx: pos.x - xPct,
      grabDy: pos.y - yPct,
      ox: e.clientX,
      oy: e.clientY,
      dragged: false,
    };
    dragSessionRef.current = session;
    setDraggingNodeId(nodeId);

    const onMove = (ev: PointerEvent) => {
      const s = dragSessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      const dx = ev.clientX - s.ox;
      const dy = ev.clientY - s.oy;
      if (!s.dragged) {
        if (dx * dx + dy * dy < NODE_DRAG_CLICK_THRESHOLD_PX * NODE_DRAG_CLICK_THRESHOLD_PX) return;
        s.dragged = true;
      }
      const p = clientToPercent(ev.clientX, ev.clientY);
      const nx = clampPct(p.x + s.grabDx);
      const ny = clampPct(p.y + s.grabDy);
      setPositions((prev) => ({ ...prev, [s.nodeId]: { x: nx, y: ny } }));
    };

    const onUp = (ev: PointerEvent) => {
      const s = dragSessionRef.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      endNodeDragListeners(onMove, onUp);
      dragSessionRef.current = null;
      setDraggingNodeId(null);
      if (s.dragged) {
        suppressNextClickRef.current = true;
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div className="relative w-full">
      <div className="absolute right-2 top-2 z-20 flex gap-0.5 rounded-sm border border-gitlore-border bg-gitlore-bg/90 p-0.5 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          title="Zoom out"
          className="rounded-sm p-1.5 text-gitlore-text-secondary transition-colors hover:bg-gitlore-surface hover:text-gitlore-text"
          onClick={() => zoomByFactor(0.85)}
        >
          <ZoomOut className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          title="Zoom in"
          className="rounded-sm p-1.5 text-gitlore-text-secondary transition-colors hover:bg-gitlore-surface hover:text-gitlore-text"
          onClick={() => zoomByFactor(1.15)}
        >
          <ZoomIn className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          title="Reset zoom and node positions"
          className="rounded-sm p-1.5 text-gitlore-text-secondary transition-colors hover:bg-gitlore-surface hover:text-gitlore-text"
          onClick={() => {
            scaleRef.current = 1;
            setScale(1);
            setPositions(initialNodePositions());
            setSelected(null);
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-sm bg-gitlore-code pb-[100%] md:pb-[80%]"
      >
        <div
          ref={graphLayerRef}
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
            {EDGES.map(([a, b]) => {
              const pa = positions[a];
              const pb = positions[b];
              return (
                <line key={`${a}-${b}`} x1={`${pa.x}%`} y1={`${pa.y}%`} x2={`${pb.x}%`} y2={`${pb.y}%`} stroke="#2A2A3A" strokeWidth={1} />
              );
            })}
          </svg>

          {NODES.map((node) => {
            const pos = positions[node.id];
            return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              className={`${NODE_CLASSES[node.id]} absolute z-[1] flex items-center justify-center rounded-full border-2 transition-[box-shadow,transform] ${
                selected === node.id ? "ring-2 ring-gitlore-accent ring-offset-2 ring-offset-gitlore-code" : ""
              } ${draggingNodeId === node.id ? "z-[2] cursor-grabbing" : "cursor-grab"}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: node.size, height: node.size }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              onPointerDown={(e) => onNodePointerDown(e, node.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (suppressNextClickRef.current) {
                  suppressNextClickRef.current = false;
                  return;
                }
                setSelected(node.id);
                navigate("/app", { state: { file: node.fullName } });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(node.id);
                  navigate("/app", { state: { file: node.fullName } });
                }
              }}
            >
              <span className={`pointer-events-none select-none font-code text-gitlore-text ${node.size > 30 ? "text-[8px]" : "text-[7px]"}`}>{node.label}</span>

              {hovered === node.id && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-sm border border-gitlore-border bg-gitlore-surface px-3 py-1.5 text-[11px] shadow-md">
                  <span className="font-code text-gitlore-text">{node.fullName}</span>
                  <span className="text-gitlore-text-secondary">
                    {" "}&mdash; {node.changes} changes, {node.authors} {node.authors === 1 ? "author" : "authors"}
                  </span>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const HealthBar = ({ score, max }: { score: number; max: number }) => (
  <div className="flex items-center gap-3">
    <progress className="overview-health-progress h-2 w-full overflow-hidden rounded-sm" value={score} max={max} />
    <span className="shrink-0 font-code text-sm text-gitlore-text">
      {score} / {max}
    </span>
  </div>
);

const Overview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gitlore-bg">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-8">
          <div className="space-y-8 md:col-span-2">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gitlore-text-secondary">Repository</div>
              <h1 className="font-heading text-2xl font-bold text-gitlore-text">facebook/react</h1>
            </div>

            <FadeIn direction="up">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "234", label: "PRs" },
                  { value: "1,523", label: "Commits" },
                  { value: "12", label: "Contributors" },
                  { value: "847", label: "Files" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-sm border border-gitlore-border bg-gitlore-surface p-3">
                    <div className="font-heading text-xl font-bold text-gitlore-text">{stat.value}</div>
                    <div className="mt-0.5 text-xs text-gitlore-text-secondary">{stat.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <div>
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gitlore-text-secondary">Code Health Score</div>
              <HealthBar score={7.2} max={10} />
            </div>

            <div>
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gitlore-text-secondary">Top Anti-Patterns Detected</div>
              <div className="space-y-2">
                {ANTI_PATTERNS.map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                    <span className="text-gitlore-text">{item.text}</span>
                    <span className="text-gitlore-text-secondary">&mdash; found {item.count} times</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-gitlore-text-secondary">Most Changed Files</div>
              <ol className="space-y-1.5">
                {MOST_CHANGED.map((file, i) => (
                  <li key={file.name} className="flex items-baseline gap-2 text-sm">
                    <span className="w-4 shrink-0 text-xs text-gitlore-text-secondary">{i + 1}.</span>
                    <button className="text-left font-code text-gitlore-accent transition-colors hover:text-gitlore-accent-hover" onClick={() => navigate("/app")}>
                      {file.name}
                    </button>
                    <span className="text-xs text-gitlore-text-secondary">({file.changes} changes)</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={() => navigate("/app")}
              className="w-full rounded-sm bg-gitlore-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gitlore-accent-hover"
            >
              Explore Code &rarr;
            </button>
          </div>

          <div className="md:col-span-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gitlore-text-secondary">Visualization</div>
            <h2 className="mb-6 font-heading text-lg font-semibold text-gitlore-text">Codebase Knowledge Graph</h2>

            <div className="rounded-sm border border-gitlore-border bg-gitlore-surface p-4 md:p-6">
              <KnowledgeGraph />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gitlore-text-secondary lg:text-xs">
              Files connected by shared PRs. Larger = more changes. Color = health. Drag a file bubble to move it; edges follow. Scroll or use the zoom buttons. Click without dragging to open in the app. Reset restores layout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
