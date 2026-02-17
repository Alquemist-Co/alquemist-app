import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WizardPhaseConfig = {
  phaseId: string;
  zoneId: string;
  durationDays: number | undefined;
  skipped: boolean;
};

type OrderWizardState = {
  step: number;
  // Step 1
  cultivarId: string;
  cropTypeId: string;
  // Step 2
  entryPhaseId: string;
  exitPhaseId: string;
  // Step 3
  initialQuantity: number;
  initialUnitId: string;
  initialProductId: string;
  // Step 4
  plannedStartDate: string;
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo: string;
  phaseConfig: WizardPhaseConfig[];
  // Step 5
  notes: string;
  // Meta
  savedAt: number | null;
};

type OrderWizardActions = {
  setStep: (step: number) => void;
  setCultivar: (cultivarId: string, cropTypeId: string) => void;
  setPhaseRange: (entryPhaseId: string, exitPhaseId: string) => void;
  setQuantity: (qty: number, unitId: string, productId?: string) => void;
  setPlanning: (data: {
    plannedStartDate: string;
    priority: "low" | "normal" | "high" | "urgent";
    assignedTo: string;
    phaseConfig: WizardPhaseConfig[];
  }) => void;
  setNotes: (notes: string) => void;
  resetWizard: () => void;
  hasDraft: () => boolean;
};

const INITIAL_STATE: OrderWizardState = {
  step: 1,
  cultivarId: "",
  cropTypeId: "",
  entryPhaseId: "",
  exitPhaseId: "",
  initialQuantity: 0,
  initialUnitId: "",
  initialProductId: "",
  plannedStartDate: "",
  priority: "normal",
  assignedTo: "",
  phaseConfig: [],
  notes: "",
  savedAt: null,
};

const TTL_24H = 24 * 60 * 60 * 1000;

export const useOrderWizardStore = create<OrderWizardState & OrderWizardActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setStep: (step) => set({ step, savedAt: Date.now() }),

      setCultivar: (cultivarId, cropTypeId) => {
        const prev = get();
        // If cultivar changed, reset downstream
        if (prev.cultivarId !== cultivarId) {
          set({
            cultivarId,
            cropTypeId,
            entryPhaseId: "",
            exitPhaseId: "",
            initialQuantity: 0,
            phaseConfig: [],
            savedAt: Date.now(),
          });
        } else {
          set({ cultivarId, cropTypeId, savedAt: Date.now() });
        }
      },

      setPhaseRange: (entryPhaseId, exitPhaseId) =>
        set({ entryPhaseId, exitPhaseId, savedAt: Date.now() }),

      setQuantity: (qty, unitId, productId) =>
        set({
          initialQuantity: qty,
          initialUnitId: unitId,
          initialProductId: productId ?? "",
          savedAt: Date.now(),
        }),

      setPlanning: (data) =>
        set({ ...data, savedAt: Date.now() }),

      setNotes: (notes) =>
        set({ notes, savedAt: Date.now() }),

      resetWizard: () => set({ ...INITIAL_STATE }),

      hasDraft: () => {
        const { savedAt, cultivarId } = get();
        if (!savedAt || !cultivarId) return false;
        return Date.now() - savedAt < TTL_24H;
      },
    }),
    {
      name: "alquemist-order-wizard",
    }
  )
);
