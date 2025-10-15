// src/utils/validation.js - UPDATED
export const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const LIMITS = {
  botNameMax: 50,
  systemMessageMax: 2000,
  fallbackMax: 200,
  firstNameMax: 50,
  lastNameMax: 50,
  companyNameMax: 100,
  passwordMin: 6,
};

// Step-level validation
export const validateStep = (stepKey, values) => {
  const stepErrors = {};

  if (stepKey === "responses") {
    if (!values.fallback || values.fallback.trim().length === 0) {
      stepErrors.fallback = "Fallback message is required.";
    } else if (values.fallback.length > LIMITS.fallbackMax) {
      stepErrors.fallback = `Keep fallback under ${LIMITS.fallbackMax} characters.`;
    }

    const esc = values.escalation || {};
    if (esc.enabled) {
      if (!esc.escalation_email) {
        // ✅ Updated from esc.email
        stepErrors.escalationEmail =
          "Escalation email is required when escalation is enabled.";
      } else if (!emailRe.test(esc.escalation_email)) {
        // ✅ Updated
        stepErrors.escalationEmail = "Please enter a valid email address.";
      }
    }
  }

  if (stepKey === "basics") {
    if (!values.botName || values.botName.trim().length === 0) {
      stepErrors.botName = "Bot name is required.";
    } else if (values.botName.length > LIMITS.botNameMax) {
      stepErrors.botName = `Keep bot name under ${LIMITS.botNameMax} characters.`;
    }

    if (!values.model) {
      stepErrors.model = "Please select a model.";
    }

    if (
      values.systemMessage &&
      values.systemMessage.length > LIMITS.systemMessageMax
    ) {
      stepErrors.systemMessage = `Keep system message under ${LIMITS.systemMessageMax} characters.`;
    }
  }

  if (stepKey === "register") {
    const user = values.user || {};

    if (!user.email || user.email.trim().length === 0) {
      stepErrors.email = "Email is required.";
    } else if (!emailRe.test(user.email)) {
      stepErrors.email = "Please enter a valid email address.";
    }

    if (!user.password || user.password.length === 0) {
      stepErrors.password = "Password is required.";
    } else if (user.password.length < LIMITS.passwordMin) {
      stepErrors.password = `Password must be at least ${LIMITS.passwordMin} characters.`;
    }

    if (!user.firstName || user.firstName.trim().length === 0) {
      stepErrors.firstName = "First name is required.";
    } else if (user.firstName.length > LIMITS.firstNameMax) {
      stepErrors.firstName = `Keep first name under ${LIMITS.firstNameMax} characters.`;
    }

    if (!user.lastName || user.lastName.trim().length === 0) {
      stepErrors.lastName = "Last name is required.";
    } else if (user.lastName.length > LIMITS.lastNameMax) {
      stepErrors.lastName = `Keep last name under ${LIMITS.lastNameMax} characters.`;
    }

    if (!user.companyName || user.companyName.trim().length === 0) {
      stepErrors.companyName = "Company name is required.";
    } else if (user.companyName.length > LIMITS.companyNameMax) {
      stepErrors.companyName = `Keep company name under ${LIMITS.companyNameMax} characters.`;
    }
  }

  return stepErrors;
};

// Field-level validation
export const validateField = (stepKey, field, values) => {
  let message = "";

  if (stepKey === "responses") {
    if (field === "fallback") {
      if (!values.fallback || values.fallback.trim().length === 0) {
        message = "Fallback message is required.";
      } else if (values.fallback.length > LIMITS.fallbackMax) {
        message = `Keep fallback under ${LIMITS.fallbackMax} characters.`;
      }
    }

    if (field === "escalationEmail") {
      const esc = values.escalation || {};
      if (esc.enabled) {
        if (!esc.escalation_email)
          message = "Escalation email is required."; // ✅ Updated
        else if (!emailRe.test(esc.escalation_email)) {
          // ✅ Updated
          message = "Please enter a valid email address.";
        }
      } else {
        message = "";
      }
    }
  }

  if (stepKey === "basics") {
    if (field === "botName") {
      if (!values.botName || values.botName.trim().length === 0) {
        message = "Bot name is required.";
      } else if (values.botName.length > LIMITS.botNameMax) {
        message = `Keep bot name under ${LIMITS.botNameMax} characters.`;
      }
    }

    if (field === "model") {
      if (!values.model) message = "Please select a model.";
    }

    if (field === "systemMessage") {
      if (
        values.systemMessage &&
        values.systemMessage.length > LIMITS.systemMessageMax
      ) {
        message = `Keep system message under ${LIMITS.systemMessageMax} characters.`;
      }
    }
  }

  if (stepKey === "register") {
    const user = values.user || {};

    if (field === "email") {
      if (!user.email || user.email.trim().length === 0) {
        message = "Email is required.";
      } else if (!emailRe.test(user.email)) {
        message = "Please enter a valid email address.";
      }
    }

    if (field === "password") {
      if (!user.password || user.password.length === 0) {
        message = "Password is required.";
      } else if (user.password.length < LIMITS.passwordMin) {
        message = `Password must be at least ${LIMITS.passwordMin} characters.`;
      }
    }

    if (field === "firstName") {
      if (!user.firstName || user.firstName.trim().length === 0) {
        message = "First name is required.";
      } else if (user.firstName.length > LIMITS.firstNameMax) {
        message = `Keep first name under ${LIMITS.firstNameMax} characters.`;
      }
    }

    if (field === "lastName") {
      if (!user.lastName || user.lastName.trim().length === 0) {
        message = "Last name is required.";
      } else if (user.lastName.length > LIMITS.lastNameMax) {
        message = `Keep last name under ${LIMITS.lastNameMax} characters.`;
      }
    }

    if (field === "companyName") {
      if (!user.companyName || user.companyName.trim().length === 0) {
        message = "Company name is required.";
      } else if (user.companyName.length > LIMITS.companyNameMax) {
        message = `Keep company name under ${LIMITS.companyNameMax} characters.`;
      }
    }
  }

  return message;
};
