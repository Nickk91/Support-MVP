// src/components/BotEditDialog/StepContent.jsx
import BotBasicSettings from "./steps/BotBasicSettings";
import BotPersonalitySettings from "./steps/BotPersonalitySettings";
import BotSafetySettings from "./steps/BotSafetySettings";
import BotKnowledgeSettings from "./steps/BotKnowledgeSettings";
import LoadingOverlay from "./LoadingOverlay";

const STEP_COMPONENTS = {
  basic: BotBasicSettings,
  personality: BotPersonalitySettings,
  safety: BotSafetySettings,
  knowledge: BotKnowledgeSettings,
  // Removed: advanced
};

export default function StepContent({
  currentStep,
  formData,
  onChange,
  isEditing,
  fileUploadLoading,
}) {
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="min-h-[300px] relative">
      <StepComponent bot={formData} onChange={onChange} isEditing={isEditing} />

      {/* FILE UPLOAD LOADING OVERLAY */}
      <LoadingOverlay
        show={fileUploadLoading}
        title="Processing Files"
        description="Uploading and ingesting files into knowledge base..."
        zIndex={10}
      />
    </div>
  );
}
