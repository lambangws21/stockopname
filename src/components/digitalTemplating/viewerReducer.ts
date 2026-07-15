// src/components/digitalTemplating/viewerReducer.ts

import { ImplantTemplate, Point } from "./implantTypes";

/* ================= STATE ================= */

export type ViewerState = {
  pan: Point;
  zoom: number;

  // === calibration ===
  pxPerMm: number | null; // hasil kalibrasi final
  calibration: {
    points: Point[]; // 0–2 titik di X-ray
    realMm: number;  // input user (misal 50 mm)
  };

  activeTool: "implantMove" | "calibration" | null;
  canvasObjects: ImplantTemplate[];
};

export const initialViewerState: ViewerState = {
  pan: { x: 0, y: 0 },
  zoom: 1,

  pxPerMm: null,
  calibration: {
    points: [],
    realMm: 50,
  },

  activeTool: null,
  canvasObjects: [],
};

/* ================= ACTION ================= */

export type ViewerAction =
  | { type: "ADD_IMPLANT"; payload: ImplantTemplate }
  | { type: "UPDATE_IMPLANT"; payload: ImplantTemplate }
  | { type: "SET_ACTIVE_TOOL"; payload: ViewerState["activeTool"] }
  | { type: "ADD_CALIBRATION_POINT"; payload: Point }
  | { type: "RESET_CALIBRATION" }
  | { type: "SET_REAL_MM"; payload: number }
  | { type: "COMPUTE_PX_PER_MM" };

/* ================= REDUCER ================= */

export function viewerReducer(
  state: ViewerState,
  action: ViewerAction
): ViewerState {
  switch (action.type) {
    /* ===== IMPLANT ===== */
    case "ADD_IMPLANT":
      return {
        ...state,
        canvasObjects: [...state.canvasObjects, action.payload],
      };

    case "UPDATE_IMPLANT":
      return {
        ...state,
        canvasObjects: state.canvasObjects.map((o) =>
          o.id === action.payload.id ? action.payload : o
        ),
      };

    /* ===== TOOL ===== */
    case "SET_ACTIVE_TOOL":
      return {
        ...state,
        activeTool: action.payload,
      };

    /* ===== CALIBRATION ===== */
    case "ADD_CALIBRATION_POINT": {
      const pts =
        state.calibration.points.length >= 2
          ? [action.payload]
          : [...state.calibration.points, action.payload];

      return {
        ...state,
        calibration: {
          ...state.calibration,
          points: pts,
        },
      };
    }

    case "SET_REAL_MM":
      return {
        ...state,
        calibration: {
          ...state.calibration,
          realMm: action.payload,
        },
      };

    case "COMPUTE_PX_PER_MM": {
      const [a, b] = state.calibration.points;
      if (!a || !b) return state;

      const px = Math.hypot(b.x - a.x, b.y - a.y);
      const pxPerMm = px / state.calibration.realMm;

      return {
        ...state,
        pxPerMm,
      };
    }

    case "RESET_CALIBRATION":
      return {
        ...state,
        pxPerMm: null,
        calibration: {
          ...state.calibration,
          points: [],
        },
      };

    default:
      return state;
  }
}
