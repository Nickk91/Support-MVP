import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export default function NavigationButtons({
  currentStep,
  totalSteps,
  isStepValid,
  isNew,
  saveLoading,
  fileUploadLoading,
  onPrevStep,
  onNextStep,
  onSave,
  onCancel,
}) {
  const isLastStep = currentStep === totalSteps - 1;

  const getActionButton = () => {
    if (!isLastStep) {
      return (
        <Button
          onClick={onNextStep}
          disabled={!isStepValid() || saveLoading || fileUploadLoading}
        >
          Next Step
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      );
    } else {
      return (
        <Button
          onClick={onSave}
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
    <div className="flex justify-between pt-4 border-t">
      <div>
        {currentStep > 0 && (
          <Button
            variant="outline"
            onClick={onPrevStep}
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
          onClick={onCancel}
          disabled={saveLoading || fileUploadLoading}
        >
          Cancel
        </Button>

        {getActionButton()}
      </div>
    </div>
  );
}
