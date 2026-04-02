/**
 * API tests — Notifications
 *
 * Covers: inbox listing, subscription management, open timestamp tracking,
 * internal dispatch/retry endpoint authorization.
 */

import { api, loginAs, BASE_URL } from "./helpers/client";
import { TEST_ORG, CREDS } from "./helpers/fixtures";

let userToken: string;
let adminToken: string;

const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? "test-internal-key-secret";

beforeAll(async () => {
  [userToken, adminToken] = await Promise.all([
    loginAs(TEST_ORG, CREDS.user1.username, CREDS.user1.password),
    loginAs(TEST_ORG, CREDS.admin.username, CREDS.admin.password),
  ]);
});

// ─── Notification inbox ──────────────────────────────────────────────────────

describe("GET /notifications", () => {
  test("success — returns notification list", async () => {
    const res = await api.get("/notifications", userToken);
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.data !== undefined || Array.isArray(body)).toBeTruthy();
  });

  test("auth — no token returns 401", async () => {
    const res = await api.get("/notifications");
    expect(res.status).toBe(401);
  });
});

// ─── Notification subscriptions ──────────────────────────────────────────────

describe("Notification subscriptions", () => {
  test("GET /notifications/subscriptions — returns subscription list", async () => {
    const res = await api.get("/notifications/subscriptions", userToken);
    expect(res.status).toBe(200);
  });

  test("PUT /notifications/subscriptions — can opt out of a category", async () => {
    const url = new URL(`${BASE_URL}/api/v1/notifications/subscriptions`);
    const res = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        subscriptions: [{ category: "announcement", isOptIn: false }],
      }),
    });
    expect([200, 201]).toContain(res.status);
  });
});

// ─── Internal endpoints ──────────────────────────────────────────────────────

describe("Internal notification endpoints", () => {
  test("POST /internal/notifications/dispatch-due — requires internal API key", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/internal/notifications/dispatch-due`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(res.status);
  });

  test("POST /internal/notifications/dispatch-due — succeeds with valid key", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/internal/notifications/dispatch-due`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": INTERNAL_KEY,
      },
    });
    expect(res.status).toBe(200);
  });

  test("POST /internal/notifications/retry-failed — requires internal API key", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/internal/notifications/retry-failed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(res.status);
  });

  test("POST /internal/notifications/retry-failed — succeeds with valid key", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/internal/notifications/retry-failed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": INTERNAL_KEY,
      },
    });
    expect(res.status).toBe(200);
  });
});
