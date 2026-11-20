export type StreamingProvider = 'youtube' | 'netflix';
export type StreamingBandwidthResult =
  | { ok: false; error: 'provider' | 'screens' | 'no-screens' | 'other' | 'measured' }
  | { ok: true; videoMbps: number; baselineMbps: number; targetMbps: number; comparison: 'not-provided' | 'below-baseline' | 'below-target' | 'enough' };
export declare const STREAMING_RATES: Readonly<Record<StreamingProvider, Readonly<{ hd: number; fhd: number; uhd: number }>>>;
export declare const HEADROOM: number;
export declare function calculateStreamingBandwidth(input: {
  provider: StreamingProvider;
  hd: number;
  fhd: number;
  uhd: number;
  otherMbps?: number;
  measuredMbps?: number | null;
}): StreamingBandwidthResult;
