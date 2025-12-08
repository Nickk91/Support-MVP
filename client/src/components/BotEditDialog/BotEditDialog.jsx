// src/components/BotEditDialog/BotEditDialog.jsx
import { useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBotWizardStore } from "@/store/botWizardStore";
import { useUserStore } from "@/store/useUserStore";
import RobotProgress from "@/components/ui/RobotProgress/RobotProgress";
import StepProgressIndicator from "./StepProgressIndicator";
import StepContent from "./StepContent";
import NavigationButtons from "./NavigationButtons";
import LoadingOverlay from "./LoadingOverlay";

const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "personality", label: "Personality" },
  { id: "safety", label: "Safety" },
  { id: "knowledge", label: "Knowledge" },
];

export default function BotEditDialog({
  bot,
  open,
  onOpenChange,
  onSave,
  saveLoading = false,
  fileUploadLoading = false,
}) {
  const isNew = !bot;
  const { user } = useUserStore();

  const {
    formData,
    currentStep,
    updateFormData: storeUpdate,
    nextStep: storeNext,
    prevStep: storePrev,
    reset: resetStore,
    isStepValid,
  } = useBotWizardStore();

  // Calculate progress percentage
  const progress = useMemo(() => {
    return Math.round(((currentStep + 1) / STEPS.length) * 100);
  }, [currentStep]);

  const updateFormData = useCallback(
    (updates) => {
      storeUpdate(updates);
    },
    [storeUpdate]
  );

  // Initialize form when dialog opens - FIXED: Preserve custom messages
  useEffect(() => {
    if (!open) return;

    if (isNew) {
      resetStore(); // Clean slate for new bot
      return;
    }

    // Editing existing bot - preserve ALL fields including custom messages
    const payload = { ...bot };

    // Only set defaults if fields are empty
    if (!payload.personalityType) payload.personalityType = "friendly";
    if (!payload.safetyLevel) payload.safetyLevel = "standard";

    updateFormData(payload);
  }, [open, bot, isNew, updateFormData, resetStore]);

  const handleClose = useCallback(() => {
    if (saveLoading || fileUploadLoading) return;
    resetStore();
    onOpenChange(false);
  }, [saveLoading, fileUploadLoading, resetStore, onOpenChange]);

  const nextStep = useCallback(() => {
    if (isStepValid() && currentStep < STEPS.length - 1) {
      storeNext();
    }
  }, [isStepValid, currentStep, storeNext]);

  const prevStep = useCallback(() => {
    storePrev();
  }, [storePrev]);

  const prepareFilesForUpload = useCallback(
    (files) =>
      files.map((file) => ({
        ...file,
        uploadedBy: user?.id || "unknown-user",
      })),
    [user?.id]
  );

  const handleSave = useCallback(async () => {
    if (!isStepValid()) return;

    const payload = {
      ...formData,
      files: prepareFilesForUpload(formData.files || []),
    };

    await onSave(payload);
  }, [isStepValid, formData, prepareFilesForUpload, onSave]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        aria-label="Bot Edit Dialog"
        className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header with RobotProgress */}
        <div className="flex items-center gap-4 mb-4">
          <RobotProgress progress={progress} size="w-12 h-12" />
          <div className="flex-1">
            <DialogHeader className="px-1 sm:px-0">
              <DialogTitle>
                {isNew ? "Create New Bot" : `Edit ${bot?.botName}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isNew
                  ? "Create a new AI assistant by filling out the steps below"
                  : `Edit the settings and configuration for ${bot?.botName}`}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <StepProgressIndicator currentStep={currentStep} />

        <StepContent
          currentStep={STEPS[currentStep].id}
          formData={formData}
          onChange={updateFormData}
          isEditing={!isNew}
          fileUploadLoading={fileUploadLoading}
        />

        <NavigationButtons
          currentStep={currentStep}
          totalSteps={STEPS.length}
          isStepValid={isStepValid}
          isNew={isNew}
          saveLoading={saveLoading}
          fileUploadLoading={fileUploadLoading}
          onPrevStep={prevStep}
          onNextStep={nextStep}
          onSave={handleSave}
          onCancel={handleClose}
        />

        <div className="text-center text-sm text-muted-foreground pt-2">
          Step {currentStep + 1} of {STEPS.length}
        </div>

        <LoadingOverlay
          show={saveLoading && !fileUploadLoading}
          title={isNew ? "Creating Bot" : "Updating Bot"}
          description={
            isNew
              ? "Setting up your new AI assistant..."
              : "Saving your changes..."
          }
          zIndex={20}
        />
      </DialogContent>
    </Dialog>
  );
}
