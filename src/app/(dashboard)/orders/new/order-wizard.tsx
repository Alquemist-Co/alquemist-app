"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOrderWizardStore } from "@/stores/order-wizard-store";
import { useAuthStore } from "@/stores/auth-store";
import type { OrderWizardData } from "@/lib/actions/orders";
import { WizardStepper } from "./wizard-stepper";
import { StepCultivar } from "./step-cultivar";
import { StepPhases } from "./step-phases";
import { StepQuantity } from "./step-quantity";
import { StepPlanning } from "./step-planning";
import { StepReview } from "./step-review";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Props = {
  data: OrderWizardData;
};

export function OrderWizard({ data }: Props) {
  const router = useRouter();
  const store = useOrderWizardStore();
  const role = useAuthStore((s) => s.role);

  const hasDraft = store.hasDraft() && store.step > 1;
  const [maxVisitedStep, setMaxVisitedStep] = useState(
    hasDraft ? store.step : store.step,
  );
  const [showDraftDialog, setShowDraftDialog] = useState(hasDraft);

  const goToStep = useCallback(
    (step: number) => {
      store.setStep(step);
      setMaxVisitedStep((prev) => Math.max(prev, step));
    },
    [store],
  );

  const canAdvance = useCallback((): boolean => {
    switch (store.step) {
      case 1:
        return !!store.cultivarId;
      case 2:
        return !!store.entryPhaseId && !!store.exitPhaseId;
      case 3:
        return store.initialQuantity > 0 && !!store.initialUnitId;
      case 4:
        return !!store.plannedStartDate;
      default:
        return false;
    }
  }, [store]);

  const handleNext = useCallback(() => {
    if (store.step < 5 && canAdvance()) {
      goToStep(store.step + 1);
    }
  }, [store.step, canAdvance, goToStep]);

  const handlePrev = useCallback(() => {
    if (store.step > 1) {
      goToStep(store.step - 1);
    }
  }, [store.step, goToStep]);

  const handleStartOver = useCallback(() => {
    store.resetWizard();
    setMaxVisitedStep(1);
    setShowDraftDialog(false);
  }, [store]);

  const handleContinueDraft = useCallback(() => {
    setShowDraftDialog(false);
  }, []);

  // Filter data by selected cultivar
  const selectedCultivar = data.cultivars.find(
    (c) => c.id === store.cultivarId,
  );
  const cultivarPhases = selectedCultivar
    ? data.phases.filter((p) => p.cropTypeId === selectedCultivar.cropTypeId)
    : [];

  return (
    <>
      {/* Draft recovery dialog */}
      <Dialog
        open={showDraftDialog}
        onClose={handleContinueDraft}
        title="Orden en progreso"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleStartOver}>
              Empezar de nuevo
            </Button>
            <Button onClick={handleContinueDraft}>Continuar</Button>
          </div>
        }
      >
        <p className="text-secondary">
          Tienes una orden en progreso (paso {store.step} de 5). ¿Deseas
          continuar donde la dejaste o empezar de nuevo?
        </p>
      </Dialog>

      {/* Wizard header */}
      <div className="border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">Nueva Orden</h1>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="text-sm text-secondary hover:text-primary"
          >
            Cancelar
          </button>
        </div>
        <WizardStepper
          currentStep={store.step}
          onStepClick={goToStep}
          maxVisitedStep={maxVisitedStep}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {store.step === 1 && (
          <StepCultivar
            cultivars={data.cultivars}
            selectedId={store.cultivarId}
            onSelect={(cultivarId, cropTypeId) => {
              store.setCultivar(cultivarId, cropTypeId);
            }}
          />
        )}
        {store.step === 2 && (
          <StepPhases
            phases={cultivarPhases}
            entryPhaseId={store.entryPhaseId}
            exitPhaseId={store.exitPhaseId}
            phaseConfig={store.phaseConfig}
            onSelect={(entryId, exitId, config) => {
              store.setPhaseRange(entryId, exitId);
              if (config.length > 0) {
                store.setPlanning({
                  plannedStartDate: store.plannedStartDate,
                  priority: store.priority,
                  assignedTo: store.assignedTo,
                  phaseConfig: config,
                });
              }
            }}
          />
        )}
        {store.step === 3 && (
          <StepQuantity
            phases={cultivarPhases}
            phaseFlows={data.phaseFlows}
            units={data.units}
            products={data.products}
            entryPhaseId={store.entryPhaseId}
            exitPhaseId={store.exitPhaseId}
            phaseConfig={store.phaseConfig}
            initialQuantity={store.initialQuantity}
            initialUnitId={store.initialUnitId}
            initialProductId={store.initialProductId}
            onUpdate={(qty, unitId, productId) => {
              store.setQuantity(qty, unitId, productId);
            }}
          />
        )}
        {store.step === 4 && (
          <StepPlanning
            phases={cultivarPhases}
            zones={data.zones}
            users={data.users}
            cultivar={selectedCultivar ?? null}
            entryPhaseId={store.entryPhaseId}
            exitPhaseId={store.exitPhaseId}
            phaseConfig={store.phaseConfig}
            plannedStartDate={store.plannedStartDate}
            priority={store.priority}
            assignedTo={store.assignedTo}
            onUpdate={(planning) => {
              store.setPlanning(planning);
            }}
          />
        )}
        {store.step === 5 && (
          <StepReview
            data={data}
            cultivar={selectedCultivar ?? null}
            phases={cultivarPhases}
            store={store}
            role={role}
            onGoToStep={goToStep}
          />
        )}
      </div>

      {/* Navigation footer */}
      {store.step < 5 && (
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-3 lg:px-6">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={handlePrev}
            disabled={store.step === 1}
          >
            Anterior
          </Button>
          <span className="text-xs text-tertiary">
            Paso {store.step} de 5
          </span>
          <Button
            icon={ArrowRight}
            onClick={handleNext}
            disabled={!canAdvance()}
          >
            Siguiente
          </Button>
        </div>
      )}
    </>
  );
}
