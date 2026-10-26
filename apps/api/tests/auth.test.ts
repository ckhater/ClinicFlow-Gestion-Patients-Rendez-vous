import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { resetDatabase, seedUsers, login, bodyOf } from "./helpers";

const app = createApp();

describe("Authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
  });

  it("logs in with valid credentials and returns the current user without a password hash", async () => {
    const { agent, response } = await login(app, "admin@test.clinic");

    expect(response.status).toBe(200);
    const body = bodyOf<{ data: { email: string; role: string; fullName: string } }>(response);
    expect(body.data).toMatchObject({
      email: "admin@test.clinic",
      role: "admin",
      fullName: "Test Admin",
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    const setCookie = (response.headers["set-cookie"] as unknown as string[]).join(";");
    expect(setCookie).toContain("clinic_token=");
    expect(setCookie).toContain("HttpOnly");

    const me = await agent.get("/api/auth/me").expect(200);
    expect(bodyOf<{ data: { email: string } }>(me).data.email).toBe("admin@test.clinic");
  });

  it("rejects invalid credentials with a generic 401", async () => {
    const { response } = await login(app, "admin@test.clinic", "WrongPassword1!");
    expect(response.status).toBe(401);
    expect(bodyOf<{ error: { code: string } }>(response).error.code).toBe("UNAUTHORIZED");
    expect(response.body).not.toHaveProperty("data");
  });

  it("protects private endpoints when no session is present", async () => {
    const response = await request(app).get("/api/patients");
    expect(response.status).toBe(401);
    expect(bodyOf<{ error: { code: string } }>(response).error.code).toBe("UNAUTHORIZED");
  });

  it("requires a CSRF token for state-changing requests", async () => {
    const agent = request.agent(app);
    const response = await agent
      .post("/api/auth/login")
      .send({ email: "admin@test.clinic", password: "Password123!" });

    expect(response.status).toBe(403);
    expect(bodyOf<{ error: { code: string } }>(response).error.code).toBe(
      "CSRF_TOKEN_MISSING",
    );
  });

  it("returns field-level validation details for invalid payloads", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const token = bodyOf<{ data: { csrfToken: string } }>(csrf).data.csrfToken;

    const response = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", token)
      .send({ email: "not-an-email", password: "" });

    expect(response.status).toBe(400);
    const body = bodyOf<{
      error: { code: string; details: Array<{ path: string; message: string }> };
    }>(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["email", "password"]),
    );
  });

  it("rejects a tampered session cookie", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "clinic_token=this.is.not-a-valid-jwt");
    expect(response.status).toBe(401);
    expect(bodyOf<{ error: { code: string } }>(response).error.code).toBe("TOKEN_INVALID");
  });

  it("logs out and clears the session", async () => {
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    await agent.post("/api/auth/logout").set("X-CSRF-Token", csrfToken).expect(204);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});
