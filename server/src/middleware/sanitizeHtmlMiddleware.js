// server/src/middleware/sanitizeHtmlMiddleware.js
import sanitizeHtml from "sanitize-html";

const isSafeText = (input) => /^[a-zA-Z0-9\s&.,!?:;\-\*\n\r]+$/.test(input);

const decodeEntities = (str) => {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const sanitizeAndCheck = (input, depth = 0, maxDepth = 10) => {
  if (depth > maxDepth) {
    throw new Error("Maximum recursion depth exceeded");
  }
  if (typeof input === "string") {
    if (isSafeText(input)) {
      return input; // Skip sanitization for safe text
    }
    const sanitized = sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "escape",
      parser: {
        decodeEntities: false,
        encodeEntities: false, // Preserve safe entities like &
      },
    });
    if (sanitized !== input) {
      console.warn("Sanitization modified input:", {
        input,
        sanitized,
        differences: [...input]
          .map((char, i) =>
            input[i] !== sanitized[i]
              ? { index: i, inputChar: input[i], sanitizedChar: sanitized[i] }
              : null
          )
          .filter(Boolean),
      });
      if (decodeEntities(sanitized) !== input) {
        throw new Error(
          `Unsafe content detected: input="${input}", sanitized="${sanitized}"`
        );
      }
    }
    return sanitized;
  } else if (Array.isArray(input)) {
    return input.map((item) => sanitizeAndCheck(item, depth + 1, maxDepth));
  } else if (typeof input === "object" && input !== null) {
    const sanitizedObject = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitizedObject[key] = sanitizeAndCheck(
          input[key],
          depth + 1,
          maxDepth
        );
      }
    }
    return sanitizedObject;
  }
  return input;
};

export const sanitizeInput = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeAndCheck(req.body);
    }
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
