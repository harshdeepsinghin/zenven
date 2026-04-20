/**
 * Structured logger compatible with Google Cloud Logging.
 *
 * In production (NODE_ENV=production) emits JSON with a `severity` field so
 * Cloud Run automatically maps log lines to the right severity level in
 * Cloud Logging. Falls back to plain console in dev / test.
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function log(severity, message, context = {}) {
  if (IS_PRODUCTION) {
    // Cloud Logging structured log format
    process.stdout.write(
      JSON.stringify({
        severity,
        message,
        ...context,
        timestamp: new Date().toISOString()
      }) + "\n"
    );
  } else {
    const prefix = `[${severity}]`;
    if (severity === "ERROR" || severity === "CRITICAL") {
      console.error(prefix, message, Object.keys(context).length ? context : "");
    } else {
      console.log(prefix, message, Object.keys(context).length ? context : "");
    }
  }
}

const logger = {
  info: (message, context) => log("INFO", message, context),
  warn: (message, context) => log("WARNING", message, context),
  error: (message, context) => log("ERROR", message, context),
  critical: (message, context) => log("CRITICAL", message, context),
  debug: (message, context) => {
    if (!IS_PRODUCTION) log("DEBUG", message, context);
  }
};

module.exports = { logger };
