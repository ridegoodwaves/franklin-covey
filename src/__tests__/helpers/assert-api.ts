import { expect } from "vitest";

export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedError: string
): Promise<void> {
  expect(response.status).toBe(expectedStatus);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toBe(expectedError);
}

export async function assertSuccessResponse(
  response: Response,
  expectedStatus = 200
): Promise<unknown> {
  expect(response.status).toBe(expectedStatus);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body;
}

export function assertCookieAttribute(
  response: Response,
  cookieName: string,
  attribute: string
): void {
  const setCookie = response.headers.get("set-cookie") ?? "";
  expect(setCookie).toContain(cookieName);
  expect(setCookie.toLowerCase()).toContain(attribute.toLowerCase());
}
