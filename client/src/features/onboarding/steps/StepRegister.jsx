// src/features/onboarding/steps/StepRegister.jsx - REFACTORED
import { useState, useEffect } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { useUserStore } from "../../../store/useUserStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { UserPlusIcon, KeyIcon } from "@heroicons/react/24/outline";

export default function StepRegister({
  isStandalone = false,
  onSuccess = null,
  onCancel = null,
}) {
  const {
    next,
    prev,
    values,
    updateUser,
    validateStep,
    validateField,
    errors,
    setAuthenticated,
  } = useWizardStore();

  const { login } = useUserStore();

  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userData = values.user || {};
  const [formData, setFormData] = useState(() => ({
    email: userData.email || "",
    password: userData.password || "",
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    companyName: userData.companyName || "",
  }));

  // Update store when navigating away (only in wizard mode)
  useEffect(() => {
    if (!isStandalone) {
      return () => {
        updateUser(formData);
      };
    }
  }, [formData, updateUser, isStandalone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Save current form data to store before submission (only in wizard mode)
    if (!isStandalone) {
      updateUser(formData);
    }

    // Validate form before submission
    if (!isLogin && !isStandalone && !validateStep("register")) {
      setLoading(false);
      setError("Please fix the validation errors above.");
      return;
    }

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";

      const payload = isLogin
        ? {
            email: formData.email,
            password: formData.password,
          }
        : {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            companyName: formData.companyName,
            // Include bot configuration for context (only in wizard mode)
            ...(!isStandalone && {
              botConfig: {
                botName: values.botName,
                model: values.model,
              },
            }),
          };

      console.log("🔐 Sending auth request to:", endpoint);
      console.log("📦 Payload:", payload);

      const { data } = await api.post(endpoint, payload);

      if (!data.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // ✅ Use the user store
      login(data.user, data.access_token);

      // Update wizard store authentication status (only in wizard mode)
      if (!isStandalone) {
        setAuthenticated(true);
      }

      console.log("✅ Auth successful:", data.user);

      // Handle success based on context
      if (isStandalone && onSuccess) {
        onSuccess(data.user);
      } else if (!isStandalone) {
        // Continue to knowledge base in wizard mode
        next();
      }
    } catch (err) {
      console.error("❌ Auth failed:", err);

      // Handle different error types
      if (err.response?.data?.error === "email_exists") {
        setError(
          "An account with this email already exists. Please sign in instead."
        );
        setIsLogin(true); // Auto-switch to login
      } else if (err.response?.data?.error === "invalid_credentials") {
        setError("Invalid email or password. Please try again.");
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(
          "Authentication failed. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (!isLogin && !isStandalone) {
      validateField("register", field);
    }
  };

  const handleModeSwitch = () => {
    if (!isStandalone) {
      updateUser(formData);
    }
    setIsLogin(!isLogin);
    setError("");

    if (!isLogin && !isStandalone) {
      Object.keys(formData).forEach((field) => {
        validateField("register", field);
      });
    }
  };

  const registerErrors = errors?.register || {};

  return (
    <>
      <div className="flex items-center justify-center mb-4">
        {isLogin ? (
          <KeyIcon className="h-8 w-8 text-blue-600" />
        ) : (
          <UserPlusIcon className="h-8 w-8 text-blue-600" />
        )}
      </div>

      <h3 className="mb-3 text-lg font-semibold text-center">
        {isLogin ? "Sign In to Your Account" : "Create Your Account"}
      </h3>

      <p className="text-sm text-muted-foreground mb-4 text-center">
        {isLogin
          ? "Welcome back! Sign in to continue building your bot."
          : "Almost there! Create your account to upload documents and deploy your bot."}
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData("email", e.target.value)}
            onBlur={() =>
              !isLogin && !isStandalone && validateField("register", "email")
            }
            placeholder="your@company.com"
            required
            className={
              registerErrors.email
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {registerErrors.email && (
            <p className="text-sm text-destructive">{registerErrors.email}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => updateFormData("password", e.target.value)}
            onBlur={() =>
              !isLogin && !isStandalone && validateField("register", "password")
            }
            placeholder="••••••••"
            required
            minLength="6"
            className={
              registerErrors.password
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {registerErrors.password && (
            <p className="text-sm text-destructive">
              {registerErrors.password}
            </p>
          )}
        </div>

        {!isLogin && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => updateFormData("firstName", e.target.value)}
                onBlur={() =>
                  !isStandalone && validateField("register", "firstName")
                }
                placeholder="John"
                required={!isStandalone}
                className={
                  registerErrors.firstName
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {registerErrors.firstName && (
                <p className="text-sm text-destructive">
                  {registerErrors.firstName}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => updateFormData("lastName", e.target.value)}
                onBlur={() =>
                  !isStandalone && validateField("register", "lastName")
                }
                placeholder="Doe"
                required={!isStandalone}
                className={
                  registerErrors.lastName
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {registerErrors.lastName && (
                <p className="text-sm text-destructive">
                  {registerErrors.lastName}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => updateFormData("companyName", e.target.value)}
                onBlur={() =>
                  !isStandalone && validateField("register", "companyName")
                }
                placeholder="Your Company Inc."
                required={!isStandalone}
                className={
                  registerErrors.companyName
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {registerErrors.companyName && (
                <p className="text-sm text-destructive">
                  {registerErrors.companyName}
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={handleModeSwitch}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {isLogin
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>

      {/* Conditional rendering based on context */}
      {!isStandalone ? (
        <StepActions>
          <Button variant="outline" onClick={prev}>
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              updateUser(formData);
              next();
            }}
            disabled={!localStorage.getItem("authToken")}
          >
            Skip for now
          </Button>
        </StepActions>
      ) : (
        // Show cancel button only in standalone mode when onCancel exists and user is in login mode
        onCancel &&
        isLogin && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )
      )}
    </>
  );
}
