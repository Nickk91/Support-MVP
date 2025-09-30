import morgan from "morgan";

// Request logger (tiny dev format by default)
export const requestLogger = morgan("dev");

// Error logger — logs stack traces
export function errorLogger(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err.stack || err);
  next(err);
}
