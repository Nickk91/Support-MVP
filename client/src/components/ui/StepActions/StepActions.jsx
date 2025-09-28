// src/components/ui/StepActions/StepActions.jsx
export default function StepActions({ children }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}
