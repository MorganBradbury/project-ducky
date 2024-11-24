/**
 * Logs uncaught exceptions and promise rejections.
 */
export function setupGlobalErrorHandlers(): void {
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
  });
}
