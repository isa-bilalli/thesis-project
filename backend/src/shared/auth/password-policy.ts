import { truncates } from "bcryptjs";

export const passwordPolicyDescription =
  "must contain between 12 and 128 characters and cannot exceed 72 UTF-8 bytes";

export function satisfiesPasswordPolicy(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    value.length <= 128 &&
    !truncates(value)
  );
}
