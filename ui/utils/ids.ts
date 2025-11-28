/**
 * Utility functions for generating IDs
 */

/**
 * Generates a random ID with the specified prefix
 * @param prefix The prefix to use for the ID (default: "app")
 * @returns A string in the format "{prefix}_{randomString}" where randomString is a hyphenless UUID
 */
export function generateRandomId(prefix: string = "app"): string {
  // Use full UUID for entropy and strip hyphens to keep the token compact
  const randomPart = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${randomPart}`;
}
