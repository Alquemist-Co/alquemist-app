/**
 * Pure function to calculate the yield cascade across production phases.
 * Usable both client-side (wizard preview) and server-side (order creation).
 */

export type CascadePhase = {
  phaseId: string;
  phaseName: string;
  phaseCode: string;
  inputQty: number;
  yieldPct: number;
  outputQty: number;
  hasFlows: boolean;
};

export type PhaseFlowInfo = {
  phaseId: string;
  phaseName: string;
  phaseCode: string;
  primaryOutputYieldPct: number | null; // null = no flows configured
};

export function calculateYieldCascade(
  phases: PhaseFlowInfo[],
  initialQuantity: number
): CascadePhase[] {
  const result: CascadePhase[] = [];
  let currentQty = initialQuantity;

  for (const phase of phases) {
    const hasFlows = phase.primaryOutputYieldPct !== null;
    const yieldPct = phase.primaryOutputYieldPct ?? 100;
    const outputQty = currentQty * (yieldPct / 100);

    result.push({
      phaseId: phase.phaseId,
      phaseName: phase.phaseName,
      phaseCode: phase.phaseCode,
      inputQty: currentQty,
      yieldPct,
      outputQty,
      hasFlows,
    });

    currentQty = outputQty;
  }

  return result;
}
