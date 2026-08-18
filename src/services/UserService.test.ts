import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../database/data-source";
import { User, UserRole } from "../entities/User";
import { UserService } from "./UserService";

describe("UserService", () => {
  const userService = new UserService();

  let adminId: number;
  let viewerId: number;

  beforeAll(async () => {
    AppDataSource.setOptions({
      database: ":memory:",
      dropSchema: true,
      synchronize: true,
    });

    await AppDataSource.initialize();
  });

  beforeEach(async () => {
    const userRepository = AppDataSource.getRepository(User);

    await userRepository.clear();

    const admin = userRepository.create({
      name: "Admin User",
      email: "admin@example.com",
      passwordHash: "hashed-admin-password",
      role: UserRole.ADMIN,
    });

    const viewer = userRepository.create({
      name: "Viewer User",
      email: "viewer@example.com",
      passwordHash: "hashed-viewer-password",
      role: UserRole.VIEWER,
    });

    const savedAdmin = await userRepository.save(admin);

    const savedViewer = await userRepository.save(viewer);

    adminId = savedAdmin.id;
    viewerId = savedViewer.id;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("returns users without exposing password hashes", async () => {
    const users = await userService.getAllUsers();

    expect(users).toHaveLength(2);

    expect(users[0]).not.toHaveProperty("passwordHash");

    expect(users[1]).not.toHaveProperty("passwordHash");
  });

  it("allows an admin to promote a viewer to operator", async () => {
    const updatedUser = await userService.updateUserRole(adminId, viewerId, UserRole.OPERATOR);

    expect(updatedUser.role).toBe(UserRole.OPERATOR);

    const userRepository = AppDataSource.getRepository(User);

    const savedUser = await userRepository.findOneByOrFail({
      id: viewerId,
    });

    expect(savedUser.role).toBe(UserRole.OPERATOR);
  });

  it("allows an admin to promote another user to admin", async () => {
    const updatedUser = await userService.updateUserRole(adminId, viewerId, UserRole.ADMIN);

    expect(updatedUser.role).toBe(UserRole.ADMIN);
  });

  it("rejects changing the authenticated user's own role", async () => {
    const updateRole = userService.updateUserRole(adminId, adminId, UserRole.VIEWER);

    await expect(updateRole).rejects.toMatchObject({
      message: "You cannot change your own role",
      statusCode: 400,
    });
  });

  it("rejects assigning the role a user already has", async () => {
    const updateRole = userService.updateUserRole(adminId, viewerId, UserRole.VIEWER);

    await expect(updateRole).rejects.toMatchObject({
      message: "User already has the VIEWER role",
      statusCode: 400,
    });
  });

  it("rejects changing the role of a missing user", async () => {
    const updateRole = userService.updateUserRole(adminId, 999, UserRole.OPERATOR);

    await expect(updateRole).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });
});
