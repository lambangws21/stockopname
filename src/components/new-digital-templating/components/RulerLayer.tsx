// digitalTemplating/components/RulerLayer.tsx
"use client";

import type { RulerObject } from "../types";

export function RulerLayer({
  rulers,
  activeId,
}: {
  rulers: RulerObject[];
  activeId: string | null;
}) {
  return (
    <svg className="absolute inset-0 pointer-events-none">
      {rulers.map((r) => {
        const isActive = r.id === activeId;
        const mx = (r.a.x + r.b.x) / 2;
        const my = (r.a.y + r.b.y) / 2;

        return (
          <g key={r.id}>
            <line
              x1={r.a.x}
              y1={r.a.y}
              x2={r.b.x}
              y2={r.b.y}
              stroke={isActive ? "lime" : "red"}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <circle cx={r.a.x} cy={r.a.y} r={5} fill={isActive ? "lime" : "red"} />
            <circle cx={r.b.x} cy={r.b.y} r={5} fill={isActive ? "lime" : "red"} />

            {r.label && (
              <text
                x={mx}
                y={my - 8}
                fill={isActive ? "lime" : "red"}
                fontSize="14"
                textAnchor="middle"
              >
                {r.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
