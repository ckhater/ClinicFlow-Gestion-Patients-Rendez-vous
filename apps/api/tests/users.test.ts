import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  bodyOf,
  login,
  resetDatabase,
  seedUsers,
  TEST_PASSWORD,
} from "./helpers";

const app = createApp();

describe("User management permissions", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
  });

  it("forbids staff from listing or creating users", async () => {
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const list = await agent.get("/api/users");
    expect(list.status).toBe(403);

    const create = await agent
      .post("/api/users")
      .set("X-CSRF-Token", csrfToken)
      .send({
        fullName: "Escalation Attempt",
        email: "escalation@test.clinic",
        password: "Password123!",
        role: "admin",
      });
    expect(create.status).toBe(403);
    expect(bodyOf<{ error: { code: string } }>(create).error.code).toBe("FORBIDDEN");
  });

  it("lists users for admins without exposing password hashes", async () => {
    const { agent } = await login(app, "admin@test.clinic");
    const response = await agent.get("/api/users").expect(200);

    const body = bodyOf<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(
      response,
    );
    expect(body.pagination.total).toBe(3);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(body.data[0]).not.toHaveProperty("passwordHash");
  });

  it("creates a staff account and rejects duplicate emails", async () => {
    const { agent, csrfToken } = await login(app, "admin@test.clinic");
    const payload = {
      fullName: "New Receptionist",
      email: "reception@test.clinic",
      password: "Reception123!",
      role: "staff",
    };

    const created = await agent
      .post("/api/users")
      .set("X-CSRF-Token", csrfToken)
      .send(payload);
    expect(created.status).toBe(201);
    expect(bodyOf<{ data: { role: string } }>(created).data.role).toBe("staff");

    const duplicate = await agent
      .post("/api/users")
      .set("X-CSRF-Token", csrfToken)
      .send(payload);
    expect(duplicate.status).toBe(409);

    const weakPassword = await agent
      .post("/api/users")
      .set("X-CSRF-Token", csrfToken)
      .send({ ...payload, email: "weak@test.clinic", password: "short" });
    expect(weakPassword.status).toBe(400);
  });

  it("prevents an admin from changing their own role or deactivating themselves", async () => {
    const { agent, csrfToken } = await login(app, "admin@test.clinic");
    const me = await agent.get("/api/auth/me").expect(200);
    const adminId = bodyOf<{ data: { id: string } }>(me).data.id;

    const roleChange = await agent
      .patch(`/api/users/${adminId}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ role: "staff" });
    expect(roleChange.status).toBe(403);

    const deactivate = await agent
      .delete(`/api/users/${adminId}`)
      .set("X-CSRF-Token", csrfToken);
    expect(deactivate.status).toBe(422);
  });

  it("deactivates a user and immediately revokes their access", async () => {
    const other = await prisma.user.findFirstOrThrow({
      where: { email: "other.staff@test.clinic" },
    });
    const { agent, csrfToken } = await login(app, "admin@test.clinic");

    await agent
      .delete(`/api/users/${other.id}`)
      .set("X-CSRF-Token", csrfToken)
      .expect(200);

    const stored = await prisma.user.findUnique({ where: { id: other.id } });
    expect(stored?.deletedAt).not.toBeNull();

    const loginAttempt = await login(app, "other.staff@test.clinic");
    expect(loginAttempt.response.status).toBe(401);
  });

  it("lets admins update allowed fields and reset a password", async () => {
    const staff = await prisma.user.findFirstOrThrow({
      where: { email: "staff@test.clinic" },
    });
    const { agent, csrfToken } = await login(app, "admin@test.clinic");

    const updated = await agent
      .patch(`/api/users/${staff.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ fullName: "Updated Staff", password: "NewPassword123!" })
      .expect(200);
    expect(bodyOf<{ data: { fullName: string } }>(updated).data.fullName).toBe("Updated Staff");

    const oldLogin = await login(app, "staff@test.clinic", TEST_PASSWORD);
    expect(oldLogin.response.status).toBe(401);

    const newLogin = await login(app, "staff@test.clinic", "NewPassword123!");
    expect(newLogin.response.status).toBe(200);
  });
});
