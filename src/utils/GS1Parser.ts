// utils/GS1Parser.ts

export interface GS1Data {
    gtin?: string;
    lot?: string;
    exp?: string;
  }
  
  export function parseGS1(raw: string): GS1Data {
    const result: GS1Data = {};
    let i = 0;
  
    const read = (len: number) => {
      const val = raw.substring(i, i + len);
      i += len;
      return val;
    };
  
    while (i < raw.length) {
      const ai = raw.substring(i, i + 2);
  
      switch (ai) {
        case "01": {
          i += 2;
          result.gtin = read(14);
          break;
        }
        case "17": {
          i += 2;
          result.exp = read(6);
          break;
        }
        case "10": { // LOT variable length (until separator or end)
          i += 2;
          let end = raw.indexOf("\u001D", i);
          if (end === -1) end = raw.length;
          result.lot = raw.substring(i, end);
          i = end;
          break;
        }
        default:
          i++;
      }
    }
  
    return result;
  }
  