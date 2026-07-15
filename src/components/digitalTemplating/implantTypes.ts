export type Point = {
    x: number;
    y: number;
  };
  
  export type ImplantTemplate = {
    id: string;
    type: "implant";
    name: string;
    imageSrc: string;
    position: Point;
  
    scaleX: number;
    scaleY: number;
    rotation: number;
  
    opacity: number;
    locked: boolean;
  
    // 🔥 TAMBAHAN PENTING
    flipH: boolean;
    flipV: boolean;
  };
  
  