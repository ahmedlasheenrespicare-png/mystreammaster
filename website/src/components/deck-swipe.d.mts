export declare const AXIS_LOCK: number;
export declare const SWIPE_THRESHOLD: number;
export declare const MAX_DRAG: number;
export declare const RUBBER_BAND: number;

export declare function pickAxis(dx: number, dy: number): "x" | "y" | null;
export declare function dragOffset(dx: number): number;
export declare function swipeDirection(dx: number): "next" | "prev" | null;
export declare function stepIndex(index: number, delta: number, count: number): number;
