// UPDATED BotEditDialog.jsx with proper file upload handling
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import BotBasicSettings from "./BotBasicSettings";
import BotBehaviorSettings from "./BotBehaviorSettings";
import BotKnowledgeSettings from "./BotKnowledgeSettings";
import BotAdvancedSettings from "./BotAdvancedSettings";
import { useBotWizardStore } from "@/store/botWizardStore";
import { useUserStore } from "@/store/useUserStore"; // Import user store

const STEPS = [
  { id: "basic", label: "Basic Info", component: BotBasicSettings },
  { id: "behavior", label: "Behavior", component: BotBehaviorSettings },
  { id: "knowledge", label: "Knowledge", component: BotKnowledgeSettings },
  { id: "advanced", label: "Advanced", component: BotAdvancedSettings },
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
  const { user } = useUserStore(); // Get user data for file uploads

  // Get store state and actions
  const {
    formData,
    currentStep,
    updateFormData,
    setCurrentStep,
    nextStep: storeNextStep,
    prevStep: storePrevStep,
    reset: resetStore,
    isStepValid,
  } = useBotWizardStore();

  const CurrentStepComponent = STEPS[currentStep].component;
  const isLastStep = currentStep === STEPS.length - 1;

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
      uploadedBy: user?.id || "unknown-user", // Use actual user ID
      // Remove tenantId and fileObject from the data sent to bot creation
    }));
  };

  const handleSave = async () => {
    if (isStepValid()) {
      // Prepare the data for saving
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

  // Determine button text and state
  const getActionButton = () => {
    if (!isLastStep) {
      return (
        <Button
          onClick={nextStep}
          disabled={!isStepValid() || saveLoading || fileUploadLoading}
        >
          Next Step
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      );
    } else {
      return (
        <Button
          onClick={handleSave}
          disabled={!isStepValid() || saveLoading || fileUploadLoading}
          className="min-w-[120px]"
        >
          {saveLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {isNew ? "Creating..." : "Saving..."}
            </>
          ) : fileUploadLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>{isNew ? "Create Bot" : "Save Changes"}</>
          )}
        </Button>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Create New Bot" : `Edit ${bot.botName}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>

              {/* Step Label */}
              <span
                className={`ml-2 text-sm ${
                  index === currentStep
                    ? "text-primary font-medium"
                    : index < currentStep
                    ? "text-green-600 font-medium"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </span>

              {/* Connector Line (except for last step) */}
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    index < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="min-h-[300px] relative">
          <CurrentStepComponent bot={formData} onChange={updateFormData} />

          {/* FILE UPLOAD LOADING OVERLAY */}
          {fileUploadLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
              <div className="text-center p-6 bg-white rounded-lg shadow-lg border">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <h4 className="font-medium mb-1">Processing Files</h4>
                <p className="text-sm text-muted-foreground">
                  Uploading and ingesting files into knowledge base...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={saveLoading || fileUploadLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saveLoading || fileUploadLoading}
            >
              Cancel
            </Button>

            {getActionButton()}
          </div>
        </div>

        {/* BOT CREATION LOADING OVERLAY */}
        {saveLoading && !fileUploadLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
            <div className="text-center p-6 bg-white rounded-lg shadow-lg border">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <h4 className="font-medium mb-1">
                {isNew ? "Creating Bot" : "Updating Bot"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {isNew
                  ? "Setting up your new AI assistant..."
                  : "Saving your changes..."}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
