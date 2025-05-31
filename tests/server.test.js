const request = require("supertest");
const { app, resetProfiles } = require("../app");

beforeEach(() => {
  resetProfiles();
});

describe("API Endpoints", () => {
  it("Create profile returns 200 and profile data", async () => {
    const res = await request(app)
      .post("/create-profile")
      .send({ telegram_id: "test_user_1", nickname: "TestBot1" });

    expect(res.statusCode).toBe(200);
    expect(res.body.profile).toHaveProperty("nickname", "TestBot1");
  });

  it("Fight without profile returns 400", async () => {
    const res = await request(app)
      .post("/fight")
      .send({ telegram_id: "nonexistent_user" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Profile not found");
  });

  it("Create profile with missing fields returns 400", async () => {
    const res = await request(app)
      .post("/create-profile")
      .send({ telegram_id: "test_user_2" }); // missing nickname

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Missing telegram_id or nickname.");
  });

  it("Creating a duplicate profile returns 400", async () => {
    await request(app)
      .post("/create-profile")
      .send({ telegram_id: "test_user_3", nickname: "TestBot3" });
  
    const res = await request(app)
      .post("/create-profile")
      .send({ telegram_id: "test_user_3", nickname: "TestBot3" });
  
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Profile already exists.");
  });

  it("Retrieving an existing profile returns profile data", async () => {
    await request(app)
      .post("/create-profile")
      .send({ telegram_id: "test_user_4", nickname: "TestBot4" });
  
    const res = await request(app)
      .get("/profile/test_user_4");
  
    expect(res.statusCode).toBe(200);
    expect(res.body.exists).toBe(true);
    expect(res.body.profile).toHaveProperty("nickname", "TestBot4");
  });

  it("Retrieving a non-existing profile returns exists: false", async () => {
    const res = await request(app)
      .get("/profile/nonexistent_user");
  
    expect(res.statusCode).toBe(200);
    expect(res.body.exists).toBe(false);
  });

  it("Fight with an existing profile returns 200 and updates profile", async () => {
    await request(app)
      .post("/create-profile")
      .send({ telegram_id: "test_user_5", nickname: "TestBot5" });
  
    const res = await request(app)
      .post("/fight")
      .send({ telegram_id: "test_user_5" });
  
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("profile");
  });
});
