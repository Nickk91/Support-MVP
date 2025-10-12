// src/features/onboarding/steps/StepRegister.jsx
import { useState } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function StepRegister() {
  const { next, prev, values, update } = useWizardStore();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "", // 🆕 Added
    lastName: "", // 🆕 Added
    companyName: "", // 🆕 Changed from 'company' to 'companyName'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";

      // 🛠️ Fix: Use correct field names for backend
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
            botName: values.botName, // Include bot config from wizard
          };

      console.log("🔐 Sending auth payload:", payload);

      const { data } = await api.post(endpoint, payload);

      // Store token for future requests
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("✅ Auth successful, token stored");

      // Continue to knowledge base
      next();
    } catch (err) {
      console.error("❌ Auth failed:", err.response?.data);
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <h3 className="mb-3 text-lg font-semibold">
        {isLogin ? "🔐 Login" : "🚀 Create Your Account"}
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
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
            placeholder="your@company.com"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => updateFormData("password", e.target.value)}
            placeholder="••••••••"
            required
            minLength="8"
          />
        </div>

        {!isLogin && (
          <>
            {/* 🆕 First Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => updateFormData("firstName", e.target.value)}
                placeholder="John"
                required
              />
            </div>

            {/* 🆕 Last Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => updateFormData("lastName", e.target.value)}
                placeholder="Doe"
                required
              />
            </div>

            {/* 🛠️ Fixed: companyName instead of company */}
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => updateFormData("companyName", e.target.value)}
                placeholder="Your Company Inc."
                required
              />
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
          onClick={() => {
            setIsLogin(!isLogin);
            setError(""); // Clear errors when switching modes
          }}
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
          onClick={next}
          disabled={!localStorage.getItem("authToken")}
        >
          Skip for now
        </Button>
      </StepActions>
    </>
  );
}
