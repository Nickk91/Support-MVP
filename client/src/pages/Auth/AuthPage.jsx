// src/pages/Auth/AuthPage.jsx - UPDATED
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StepRegister from "@/features/onboarding/steps/StepRegister";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSuccess = () => {
    const from = location.state?.from?.pathname || "/dashboard";
    navigate(from, { replace: true });
  };

  const handleCancel = () => {
    navigate("/");
  };

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to Support MVP
          </CardTitle>
          <p className="text-muted-foreground">
            Sign in or create an account to get started
          </p>
        </CardHeader>
        <CardContent>
          <StepRegister
            isStandalone={true}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
