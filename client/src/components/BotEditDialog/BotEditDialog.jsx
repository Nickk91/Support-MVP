import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Add this import
} from "@/components/ui/dialog";
import { useBotWizardStore } from "@/store/botWizardStore";
import { useUserStore } from "@/store/useUserStore";
import StepProgressIndicator from "./StepProgressIndicator";
import StepContent from "./StepContent";
import NavigationButtons from "./NavigationButtons";
import LoadingOverlay from "./LoadingOverlay";

const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "behavior", label: "Behavior" },
  { id: "knowledge", label: "Knowledge" },
  { id: "advanced", label: "Advanced" },
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

  // Get store state and actions
  const {
    formData,
    currentStep,
    updateFormData,
    nextStep: storeNextStep,
    prevStep: storePrevStep,
    reset: resetStore,
    isStepValid,
  } = useBotWizardStore();

  // Initialize store with existing bot data when editing
  useEffect(() => {
    if (open && bot) {
      updateFormData(bot);
    }
  }, [open, bot, updateFormData]);

  // Prepare files for upload - ensure they have proper user IDs
  const prepareFilesForUpload = (files) => {
    return files.map((file) => ({
      ...file,
      uploadedBy: user?.id || "unknown-user",
    }));
  };

  const handleSave = async () => {
    if (isStepValid()) {
      const saveData = {
        ...formData,
        files: prepareFilesForUpload(formData.files || []),
      };
      await onSave(saveData);
      resetStore();
    }
  };

  const handleClose = () => {
    if (!saveLoading && !fileUploadLoading) {
      resetStore();
      onOpenChange(false);
    }
  };

  const nextStep = () => {
    if (isStepValid() && currentStep < STEPS.length - 1) {
      storeNextStep();
    }
  };

  const prevStep = () => {
    storePrevStep();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        aria-label="Bot Edit Dialog"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Create New Bot" : `Edit ${bot.botName}`}
          </DialogTitle>
          {/* Add DialogDescription for accessibility */}
          <DialogDescription className="sr-only">
            {isNew
              ? "Create a new AI assistant by filling out the steps below"
              : `Edit the settings and configuration for ${bot.botName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <StepProgressIndicator currentStep={currentStep} />

        {/* Current Step Content */}
        <StepContent
          currentStep={STEPS[currentStep].id}
          formData={formData}
          onChange={updateFormData}
          isEditing={!isNew}
          fileUploadLoading={fileUploadLoading}
        />

        {/* Navigation Buttons */}
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

        {/* BOT CREATION LOADING OVERLAY */}
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
