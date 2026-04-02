/**
 * API tests — Sections & Subsections
 *
 * Covers: list, create, update, subsection management, and role-based access.
 */

import { api, loginAs } from "./helpers/client";
import { TEST_ORG, CREDS, SECTION_IDS } from "./helpers/fixtures";

let adminToken: string;
let modToken: string;
let userToken: string;

beforeAll(async () => {
  [adminToken, modToken, userToken] = await Promise.all([
    loginAs(TEST_ORG, CREDS.admin.username, CREDS.admin.password),
    loginAs(TEST_ORG, CREDS.mod.username, CREDS.mod.password),
    loginAs(TEST_ORG, CREDS.user1.username, CREDS.user1.password),
  ]);
});

// ─── Sections ─────────────────────────────────────────────────────────────────

describe("GET /sections", () => {
  test("success — returns seeded sections", async () => {
    const res = await api.get("/sections", userToken);
    expect(res.status).toBe(200);
    const data = (res.body as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    const ids = data.map((s) => s.id);
    expect(ids).toContain(SECTION_IDS.alpha);
    expect(ids).toContain(SECTION_IDS.beta);
  });

  test("auth — no token returns 401", async () => {
    const res = await api.get("/sections");
    expect(res.status).toBe(401);
  });
});

describe("POST /sections", () => {
  test("success — admin creates section with name and description", async () => {
    const res = await api.post(
      "/sections",
      { name: "API Test Section", description: "Created by API test" },
      adminToken
    );
    expect(res.status).toBe(201);
    const body = res.body as Record<string, unknown>;
    expect(body.id).toBeTruthy();
    expect(body.name).toBe("API Test Section");
    expect(body.description).toBe("Created by API test");
  });

  test("success — moderator creates section", async () => {
    const res = await api.post(
      "/sections",
      { name: "Mod Section", description: "Created by mod" },
      modToken
    );
    expect(res.status).toBe(201);
  });

  test("role — USER cannot create sections (403)", async () => {
    const res = await api.post(
      "/sections",
      { name: "User Section" },
      userToken
    );
    expect(res.status).toBe(403);
  });

  test("validation — missing name returns 400", async () => {
    const res = await api.post("/sections", { description: "No name" }, adminToken);
    expect(res.status).toBe(400);
    expect((res.body.error as Record<string, unknown>).code).toBe("VALIDATION_ERROR");
  });

  test("auth — no token returns 401", async () => {
    const res = await api.post("/sections", { name: "Anon Section" });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /sections/:id", () => {
  test("success — admin updates section name (pre/post verified)", async () => {
    const create = await api.post(
      "/sections",
      { name: "Section To Update" },
      adminToken
    );
    const id = (create.body as Record<string, unknown>).id as string;

    const update = await api.patch(`/sections/${id}`, { name: "Section Updated" }, adminToken);
    expect(update.status).toBe(200);
    expect((update.body as Record<string, unknown>).name).toBe("Section Updated");
  });

  test("role — USER cannot update sections (403)", async () => {
    const res = await api.patch(`/sections/${SECTION_IDS.alpha}`, { name: "Nope" }, userToken);
    expect(res.status).toBe(403);
  });

  test("auth — no token returns 401", async () => {
    const res = await api.patch(`/sections/${SECTION_IDS.alpha}`, { name: "x" });
    expect(res.status).toBe(401);
  });
});

// ─── Subsections ──────────────────────────────────────────────────────────────

describe("Subsections", () => {
  let subsectionId: string;

  test("POST /sections/:id/subsections — admin creates subsection", async () => {
    const res = await api.post(
      `/sections/${SECTION_IDS.alpha}/subsections`,
      { name: "API Test Subsection" },
      adminToken
    );
    expect(res.status).toBe(201);
    const body = res.body as Record<string, unknown>;
    expect(body.id).toBeTruthy();
    expect(body.name).toBe("API Test Subsection");
    expect(body.sectionId).toBe(SECTION_IDS.alpha);
    subsectionId = body.id as string;
  });

  test("POST /sections/:id/subsections — USER cannot create (403)", async () => {
    const res = await api.post(
      `/sections/${SECTION_IDS.alpha}/subsections`,
      { name: "User Subsection" },
      userToken
    );
    expect(res.status).toBe(403);
  });

  test("GET /sections/:id/subsections — lists subsections", async () => {
    const res = await api.get(`/sections/${SECTION_IDS.alpha}/subsections`, userToken);
    expect(res.status).toBe(200);
    const data = (res.body as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /sections/:id/subsections — non-existent section returns 404", async () => {
    const res = await api.get("/sections/nonexistent-section-xyz/subsections", userToken);
    expect(res.status).toBe(404);
  });

  test("validation — missing subsection name returns 400", async () => {
    const res = await api.post(
      `/sections/${SECTION_IDS.alpha}/subsections`,
      {},
      adminToken
    );
    expect(res.status).toBe(400);
  });
});
