import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

function isApplicationError(error: unknown): error is AppError {
  if (error instanceof AppError) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (isApplicationError(error)) {
    response.status(error.statusCode).json({
      error: {
        message: error.message,
      },
    });

    return;
  }

  console.error("Unhandled error:", error);

  response.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
};