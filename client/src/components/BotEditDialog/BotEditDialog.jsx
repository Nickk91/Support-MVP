// src/components/BotEditDialog/BotEditDialog.jsx - UPDATED
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BotBasicSettings from "./BotBasicSettings";
import BotBehaviorSettings from "./BotBehaviorSettings";
import BotKnowledgeSettings from "./BotKnowledgeSettings";
import BotAdvancedSettings from "./BotAdvancedSettings";
import { useBotWizardStore } from "@/store/botWizardStore";

const STEPS = [
  { id: "basic", label: "Basic Info", component: BotBasicSettings },
  { id: "behavior", label: "Behavior", component: BotBehaviorSettings },
  { id: "knowledge", label: "Knowledge", component: BotKnowledgeSettings },
  { id: "advanced", label: "Advanced", component: BotAdvancedSettings },
];

export default function BotEditDialog({ bot, open, onOpenChange, onSave }) {
  const isNew = !bot;

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

  const handleSave = () => {
    onSave(formData);
    resetStore(); // Reset store after saving
  };

  const handleClose = () => {
    resetStore(); // Reset store when closing
    onOpenChange(false);
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
        <div className="min-h-[300px]">
          <CurrentStepComponent bot={formData} onChange={updateFormData} />
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>

            {!isLastStep ? (
              <Button onClick={nextStep} disabled={!isStepValid()}>
                Next Step
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!isStepValid()}>
                {isNew ? "Create Bot" : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
