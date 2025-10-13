// src/features/onboarding/steps/StepRegister.jsx
import { useState, useEffect } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { UserPlusIcon, KeyIcon } from "@heroicons/react/24/outline";

export default function StepRegister() {
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

  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get initial user data from store
  const userData = values.user || {};

  // Initialize local form data with store values - ONLY ONCE
  const [formData, setFormData] = useState(() => ({
    email: userData.email || "",
    password: userData.password || "",
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    companyName: userData.companyName || "",
  }));

  // Update store only when form data changes AND user navigates away
  const updateFormData = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Validate field in real-time
    if (!isLogin) {
      validateField("register", field);
    }
  };

  // Save to store when component unmounts or when moving to next step
  useEffect(() => {
    return () => {
      // This runs when component unmounts (user navigates away)
      updateUser(formData);
    };
  }, [formData, updateUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Save current form data to store before submission
    updateUser(formData);

    // Validate form before submission
    if (!isLogin && !validateStep("register")) {
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
            botName: values.botName,
          };

      console.log("🔐 Sending auth payload:", payload);

      const { data } = await api.post(endpoint, payload);

      // Store token and set auth status
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // 🆕 Update store authentication status
      setAuthenticated(true);

      console.log("✅ Auth successful, user logged in");

      // Continue to knowledge base
      next();
    } catch (err) {
      console.error("❌ Auth failed:", err.response?.data);
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    // Save current form data before switching modes
    updateUser(formData);

    setIsLogin(!isLogin);
    setError("");

    // Clear validation errors when switching modes
    if (!isLogin) {
      // Clear register validation errors when switching to login
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
            onBlur={() => !isLogin && validateField("register", "email")}
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
            onBlur={() => !isLogin && validateField("register", "password")}
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
                onBlur={() => validateField("register", "firstName")}
                placeholder="John"
                required
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
                onBlur={() => validateField("register", "lastName")}
                placeholder="Doe"
                required
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
                onBlur={() => validateField("register", "companyName")}
                placeholder="Your Company Inc."
                required
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

      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Save form data before skipping
            updateUser(formData);
            next();
          }}
          disabled={!localStorage.getItem("authToken")}
        >
          Skip for now
        </Button>
      </StepActions>
    </>
  );
}
