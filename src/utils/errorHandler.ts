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

export const handleDatabaseError = (error: any): string => {
  console.log(error);
  if (
    error.code === "SQLITE_CONSTRAINT" &&
    error.message.includes("UNIQUE constraint ")
  ) {
    // Handle UNIQUE constraint errors
    const field = error.message.split(": ")[1]; // Extract the field causing the error
    return `A record with the same ${field} already exists.`;
  }

  if (error.message?.includes("already exists")) {
    return "You already have a FACEIT account linked to your profile. You cannot change this.";
  }
  // Fallback for other database errors
  return error.message;
};
