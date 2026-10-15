"use client";

export type DrawingObject = {
  id: string;
  type: string;
  number?: number;
  x?: number;
  y?: number;
  points?: number[][];
};
export type Board = {
  court: string;
  notes: string;
  objects: DrawingObject[];
};
export type SavedPlay = {
  id: string;
  title: string;
  board: Board;
  owner_id?: string;
  is_public?: boolean;
  username?: string;
  upvotes?: number;
  updated_at?: string;
};
export function CourtLines({ full = false }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="28" y="24" width="744" height="512" rx="3" />
      {full ? (
        <>
          <path d="M400 24V536" />
          <circle cx="400" cy="280" r="65" />
          {[false, true].map((flipped) => (
            <g
              key={String(flipped)}
              transform={flipped ? "translate(800 560) rotate(180)" : undefined}
            >
              <path d="M28 185H180V375H28M180 215a65 65 0 0 1 0 130M28 64H105a235 235 0 0 1 0 432H28" />
              <path d="M69 245V315M69 280H89" />
              <circle cx="101" cy="280" r="12" />
            </g>
          ))}
        </>
      ) : (
        <>
          <path d="M272 24V224H528V24M272 224a128 128 0 0 0 256 0" />
          <path strokeDasharray="7 8" d="M272 224a128 128 0 0 1 256 0" />
          <path d="M78 24V128a330 330 0 0 0 644 0V24" />
          <path d="M352 66H448M400 66V77" />
          <circle cx="400" cy="89" r="12" />
          <path d="M338 24a62 62 0 0 0 124 0M320 536a80 80 0 0 1 160 0" />
        </>
      )}
    </g>
  );
}
export function Marks({
  objects,
  onDown,
}: {
  objects: DrawingObject[];
  onDown?: (event: React.PointerEvent<SVGGElement>, id: string) => void;
}) {
  return objects.map((object) => {
    if (["player", "defender", "ball"].includes(object.type))
      return (
        <g
          key={object.id}
          transform={`translate(${object.x} ${object.y})`}
          onPointerDown={(event) => onDown?.(event, object.id)}
          style={{
            cursor: "grab",
          }}
          role="img"
          aria-label={
            object.type === "ball"
              ? "Basketball"
              : `${object.type} ${object.number}`
          }
        >
          <circle
            r={object.type === "ball" ? 12 : 23}
            fill={
              object.type === "player"
                ? "#203a3e"
                : object.type === "ball"
                  ? "#da5c31"
                  : "#fff9ef"
            }
            stroke={object.type === "defender" ? "#da5c31" : "#fff9ef"}
            strokeWidth="3"
          />
          {object.type === "ball" ? (
            <path
              d="M-11 0H11M0 -11V11M-8 -8Q8 0 -8 8"
              stroke="#fff9ef"
              fill="none"
              strokeWidth="1.5"
            />
          ) : (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="20"
              fontWeight="700"
              fill={object.type === "player" ? "#fff" : "#bd4320"}
            >
              {object.type === "defender" ? "×" : object.number}
            </text>
          )}
        </g>
      );
    const points = object.points;
    if (points.length < 2) return null;
    const last = points[points.length - 1];
    const previous = points[points.length - 2];
    const angle =
      (Math.atan2(last[1] - previous[1], last[0] - previous[0]) * 180) /
      Math.PI;
    return (
      <g
        key={object.id}
        stroke={object.type === "draw" ? "#444" : "#203a3e"}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        onPointerDown={(event) => onDown?.(event, object.id)}
      >
        <polyline
          points={points.map((point) => point.join(",")).join(" ")}
          stroke="transparent"
          strokeWidth="18"
          pointerEvents="stroke"
        />
        <polyline
          points={points.map((point) => point.join(",")).join(" ")}
          strokeDasharray={object.type === "pass" ? "10 9" : undefined}
        />
        {["move", "pass"].includes(object.type) && (
          <path
            d="M-13 -7L0 0L-13 7"
            transform={`translate(${last}) rotate(${angle})`}
          />
        )}{" "}
        {object.type === "screen" && (
          <path
            d="M0 -12V12"
            transform={`translate(${last}) rotate(${angle})`}
          />
        )}
      </g>
    );
  });
}
export function Mini({ board }: { board: Board }) {
  return (
    <svg
      viewBox="0 0 800 560"
      aria-hidden="true"
      className="mini-court block w-full bg-[#eee] text-[#b5b5b5]"
    >
      <CourtLines full={board.court === "full"} />
      <Marks objects={board.objects} />
    </svg>
  );
}
export function blank(): Board {
  return {
    objects: [],
    court: "half",
    notes: "",
  };
}
export function validBoard(board: Board) {
  if (!board || !Array.isArray(board.objects)) return false;
  if (board.objects.length > 1000) return false;
  if (board.court !== "half" && board.court !== "full") return false;
  if (typeof board.notes !== "string" || board.notes.length > 5000)
    return false;
  const types = [
    "player",
    "defender",
    "ball",
    "draw",
    "move",
    "pass",
    "screen",
  ];
  for (const object of board.objects) {
    if (!object || !types.includes(object.type)) return false;
    if (typeof object.id !== "string") return false;
    if (
      object.type === "player" ||
      object.type === "defender" ||
      object.type === "ball"
    ) {
      if (!Number.isFinite(object.x) || !Number.isFinite(object.y))
        return false;
      if (object.x < 0 || object.x > 800 || object.y < 0 || object.y > 700)
        return false;
      if (
        !Number.isInteger(object.number) ||
        object.number < 0 ||
        object.number > 99
      )
        return false;
    } else {
      if (!Array.isArray(object.points) || object.points.length > 10000)
        return false;
      for (const point of object.points) {
        if (!Array.isArray(point) || point.length !== 2) return false;
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]))
          return false;
        if (point[0] < 0 || point[0] > 800 || point[1] < 0 || point[1] > 700)
          return false;
      }
    }
  }
  return true;
}
export function example(): Board {
  return {
    court: "half",
    notes:
      "1 brings the ball up. 5 sets a high screen, then rolls to the basket. 2 and 3 keep the floor spaced.",
    objects: [
      {
        id: "p1",
        type: "player",
        number: 1,
        x: 400,
        y: 430,
      },
      {
        id: "p2",
        type: "player",
        number: 2,
        x: 125,
        y: 320,
      },
      {
        id: "p3",
        type: "player",
        number: 3,
        x: 675,
        y: 320,
      },
      {
        id: "p4",
        type: "player",
        number: 4,
        x: 165,
        y: 95,
      },
      {
        id: "p5",
        type: "player",
        number: 5,
        x: 445,
        y: 275,
      },
      {
        id: "b",
        type: "ball",
        number: 0,
        x: 434,
        y: 457,
      },
      {
        id: "a1",
        type: "move",
        points: [
          [400, 408],
          [320, 305],
          [350, 205],
        ],
      },
      {
        id: "a2",
        type: "move",
        points: [
          [445, 250],
          [470, 185],
          [419, 108],
        ],
      },
      {
        id: "s",
        type: "screen",
        points: [
          [425, 300],
          [365, 300],
        ],
      },
    ],
  };
}
