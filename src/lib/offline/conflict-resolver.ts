/**
 * Last-write-wins conflict resolution.
 * Server always wins in case of ambiguity.
 */

type ConflictRecord = {
  localUpdatedAt: number;
  serverUpdatedAt: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
};

export type ConflictResolution = {
  winner: "local" | "server";
  mergedData: Record<string, unknown>;
};

export function resolveConflict(record: ConflictRecord): ConflictResolution {
  const serverTs = new Date(record.serverUpdatedAt).getTime();

  // Last-write-wins: compare timestamps
  if (record.localUpdatedAt > serverTs) {
    return {
      winner: "local",
      mergedData: record.localData,
    };
  }

  // Server wins by default (including equal timestamps)
  return {
    winner: "server",
    mergedData: record.serverData,
  };
}
