import { ulid as ulidImpl } from 'ulid';

// Generate a fresh ULID (Crockford base32, 26 chars). Time-ordered.
// All ids in Zonot are ULIDs (ADR-0022 toolchain rule; CLAUDE.md house standard).
export function generateUlid(timestamp?: number): string {
  return ulidImpl(timestamp);
}

// Strict ULID format check — used by tests and external integrators.
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export function isValidUlid(value: string): boolean {
  return ULID_REGEX.test(value);
}
