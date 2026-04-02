/**
 * API tests — Object-level authorization
 *
 * Verifies that users cannot edit/delete threads and replies created by other users.
 */

import { api, loginAs } from "./helpers/client";
import { TEST_ORG, CREDS, SECTION_IDS } from "./helpers/fixtures";

let user1Token: string;
let user2Token: string;
let modToken: string;

beforeAll(async () => {
  [user1Token, user2Token, modToken] = await Promise.all([
    loginAs(TEST_ORG, CREDS.user1.username, CREDS.user1.password),
    loginAs(TEST_ORG, CREDS.user2.username, CREDS.user2.password),
    loginAs(TEST_ORG, CREDS.mod.username, CREDS.mod.password),
  ]);
});

// ─── Thread object-level authorization ───────────────────────────────────────

describe("Thread object-level authorization", () => {
  let threadId: string;

  beforeAll(async () => {
    const res = await api.post(
      "/threads",
      { sectionId: SECTION_IDS.alpha, title: "User1 Thread", body: "Owned by user1" },
      user1Token
    );
    threadId = (res.body as Record<string, unknown>).id as string;
  });

  test("owner can update their own thread", async () => {
    const res = await api.patch(
      `/threads/${threadId}`,
      { title: "User1 Thread Updated" },
      user1Token
    );
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>).title).toBe("User1 Thread Updated");
  });

  test("non-owner cannot update another user's thread (403)", async () => {
    const res = await api.patch(
      `/threads/${threadId}`,
      { title: "User2 Trying to Edit" },
      user2Token
    );
    expect(res.status).toBe(403);
  });

  test("moderator can update another user's thread", async () => {
    const res = await api.patch(
      `/threads/${threadId}`,
      { title: "Mod Updated Title" },
      modToken
    );
    expect(res.status).toBe(200);
  });

  test("non-owner cannot delete another user's thread (403)", async () => {
    const res = await api.del(`/threads/${threadId}`, user2Token);
    expect(res.status).toBe(403);
  });

  test("owner can delete their own thread", async () => {
    const t = await api.post(
      "/threads",
      { sectionId: SECTION_IDS.alpha, title: "User1 Delete Test", body: "Will delete" },
      user1Token
    );
    const id = (t.body as Record<string, unknown>).id as string;
    const res = await api.del(`/threads/${id}`, user1Token);
    expect(res.status).toBe(204);
  });

  test("moderator can delete another user's thread", async () => {
    const t = await api.post(
      "/threads",
      { sectionId: SECTION_IDS.alpha, title: "Mod Delete Test", body: "Mod will delete" },
      user1Token
    );
    const id = (t.body as Record<string, unknown>).id as string;
    const res = await api.del(`/threads/${id}`, modToken);
    expect(res.status).toBe(204);
  });
});

// ─── Reply object-level authorization ────────────────────────────────────────

describe("Reply object-level authorization", () => {
  let threadId: string;
  let replyId: string;

  beforeAll(async () => {
    const t = await api.post(
      "/threads",
      { sectionId: SECTION_IDS.alpha, title: "Reply Auth Thread", body: "For reply auth tests" },
      user1Token
    );
    threadId = (t.body as Record<string, unknown>).id as string;

    const r = await api.post(
      `/threads/${threadId}/replies`,
      { body: "User1's reply" },
      user1Token
    );
    replyId = (r.body as Record<string, unknown>).id as string;
  });

  test("owner can update their own reply", async () => {
    const res = await api.patch(
      `/replies/${replyId}`,
      { body: "User1 reply updated" },
      user1Token
    );
    expect(res.status).toBe(200);
  });

  test("non-owner cannot update another user's reply (403)", async () => {
    const res = await api.patch(
      `/replies/${replyId}`,
      { body: "User2 trying to edit" },
      user2Token
    );
    expect(res.status).toBe(403);
  });

  test("moderator can update another user's reply", async () => {
    const res = await api.patch(
      `/replies/${replyId}`,
      { body: "Mod updated reply" },
      modToken
    );
    expect(res.status).toBe(200);
  });

  test("non-owner cannot delete another user's reply (403)", async () => {
    const res = await api.del(`/replies/${replyId}`, user2Token);
    expect(res.status).toBe(403);
  });

  test("owner can delete their own reply", async () => {
    const r = await api.post(
      `/threads/${threadId}/replies`,
      { body: "Will be deleted by owner" },
      user1Token
    );
    const id = (r.body as Record<string, unknown>).id as string;
    const res = await api.del(`/replies/${id}`, user1Token);
    expect(res.status).toBe(204);
  });

  test("moderator can delete another user's reply", async () => {
    const r = await api.post(
      `/threads/${threadId}/replies`,
      { body: "Mod will delete this" },
      user1Token
    );
    const id = (r.body as Record<string, unknown>).id as string;
    const res = await api.del(`/replies/${id}`, modToken);
    expect(res.status).toBe(204);
  });
});
