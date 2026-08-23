import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { AppError } from "../../../src/shared/errors/app-error.js";

const defaultDevelopmentSecret = "development-internal-secret";

function secretsMatch(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);

    return (
        receivedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(receivedBuffer, expectedBuffer)
    );
}

export function requireInternalService(
    request: Request,
    _response: Response,
    next: NextFunction,
): void {
    const receivedSecret = request.header("x-internal-service-key") ?? "";
    const expectedSecret =
        process.env.INTERNAL_SERVICE_SECRET ?? defaultDevelopmentSecret;

    if (!secretsMatch(receivedSecret, expectedSecret)) {
        next(new AppError(401, "Internal service authentication required"));
        return;
    }

    next();
}

export function internalServiceHeaders(): Record<string, string> {
    return {
        "x-internal-service-key":
            process.env.INTERNAL_SERVICE_SECRET ?? defaultDevelopmentSecret,
    };
}
