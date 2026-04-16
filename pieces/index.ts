import type { Piece } from "@jarvis/core";
import { VoicePiece } from "./voice-piece.js";

interface PluginContext {
  bus: any;
  capabilityRegistry: any;
  config: Record<string, unknown>;
  pluginDir: string;
}

export function createPieces(ctx: PluginContext): Piece[] {
  return [new VoicePiece(ctx)];
}
