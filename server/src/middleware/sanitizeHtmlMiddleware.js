// server/src/middleware/sanitizeHtmlMiddleware.js
import sanitizeHtml from "sanitize-html";

const sanitizeAndCheck = (input) => {
  if (typeof input === "string") {
    const sanitized = sanitizeHtml(input, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
      disallowedTagsMode: "escape", // Escape any HTML tags
    });

    // Check if sanitization changed the input (indicating unsafe content)
    if (sanitized !== input) {
      throw new Error("Unsafe content detected");
    }
    return sanitized;
  } else if (Array.isArray(input)) {
    // Recursively sanitize array elements
    return input.map((item) => sanitizeAndCheck(item));
  } else if (typeof input === "object" && input !== null) {
    // Recursively sanitize object properties
    const sanitizedObject = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitizedObject[key] = sanitizeAndCheck(input[key]);
      }
    }
    return sanitizedObject;
  }
  return input;
};

export const sanitizeInput = (req, res, next) => {
  try {
    // Only sanitize request body (query and params are read-only in Express)
    if (req.body) {
      req.body = sanitizeAndCheck(req.body);
    }

    // For query and params, create sanitized copies but don't replace the originals
    // This allows the original data to be available for logging/debugging
    if (req.query && Object.keys(req.query).length > 0) {
      req.sanitizedQuery = sanitizeAndCheck(req.query);
    }

    if (req.params && Object.keys(req.params).length > 0) {
      req.sanitizedParams = sanitizeAndCheck(req.params);
    }

    next();
  } catch (error) {
    console.warn("Input sanitization blocked unsafe content:", error.message);
    res.status(400).json({
      ok: false,
      error: "unsafe_content",
      message: "Request contains unsafe content that was blocked.",
    });
  }
};
