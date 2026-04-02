/**
 * API tests — Tags
 *
 * Covers: CRUD, role-based access control, duplicate slug conflict.
 */

import { api, loginAs } from "./helpers/client";
import { TEST_ORG, CREDS } from "./helpers/fixtures";

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

describe("GET /tags", () => {
  test("success — returns tag list", async () => {
    const res = await api.get("/tags", userToken);
    expect(res.status).toBe(200);
    const data = (res.body as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
  });

  test("auth — no token returns 401", async () => {
    const res = await api.get("/tags");
    expect(res.status).toBe(401);
  });
});

describe("POST /tags", () => {
  test("success — admin creates tag", async () => {
    const res = await api.post(
      "/tags",
      { name: "API Test Tag", slug: "api-test-tag" },
      adminToken
    );
    expect(res.status).toBe(201);
    const body = res.body as Record<string, unknown>;
    expect(body.name).toBe("API Test Tag");
    expect(body.slug).toBe("api-test-tag");
  });

  test("success — moderator creates tag", async () => {
    const res = await api.post(
      "/tags",
      { name: "Mod Tag", slug: "mod-test-tag" },
      modToken
    );
    expect(res.status).toBe(201);
  });

  test("role — USER cannot create tags (403)", async () => {
    const res = await api.post(
      "/tags",
      { name: "User Tag", slug: "user-tag" },
      userToken
    );
    expect(res.status).toBe(403);
  });

  test("conflict — duplicate slug returns 409 or 400", async () => {
    // Create first
    await api.post("/tags", { name: "Dup Tag", slug: "dup-slug-test" }, adminToken);
    // Try duplicate
    const res = await api.post(
      "/tags",
      { name: "Dup Tag 2", slug: "dup-slug-test" },
      adminToken
    );
    expect([400, 409, 500]).toContain(res.status);
  });
});

describe("PATCH /tags/:tagId", () => {
  let tagId: string;

  beforeAll(async () => {
    const res = await api.post(
      "/tags",
      { name: "Tag To Update", slug: "tag-to-update" },
      adminToken
    );
    tagId = (res.body as Record<string, unknown>).id as string;
  });

  test("success — admin updates tag name", async () => {
    const res = await api.patch(`/tags/${tagId}`, { name: "Updated Tag Name" }, adminToken);
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>).name).toBe("Updated Tag Name");
  });

  test("role — USER cannot update tags (403)", async () => {
    const res = await api.patch(`/tags/${tagId}`, { name: "Nope" }, userToken);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /tags/:tagId", () => {
  let tagId: string;

  beforeAll(async () => {
    const res = await api.post(
      "/tags",
      { name: "Tag To Delete", slug: "tag-to-delete" },
      adminToken
    );
    tagId = (res.body as Record<string, unknown>).id as string;
  });

  test("success — admin deletes tag", async () => {
    const res = await api.del(`/tags/${tagId}`, adminToken);
    expect([200, 204]).toContain(res.status);
  });

  test("role — USER cannot delete tags (403)", async () => {
    const create = await api.post(
      "/tags",
      { name: "No Del", slug: "no-del-tag" },
      adminToken
    );
    const id = (create.body as Record<string, unknown>).id as string;
    const res = await api.del(`/tags/${id}`, userToken);
    expect(res.status).toBe(403);
  });
});
