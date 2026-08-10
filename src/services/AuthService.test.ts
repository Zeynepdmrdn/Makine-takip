import "reflect-metadata";
import { compare } from "bcryptjs";
import { JwtPayload, verify } from "jsonwebtoken";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { JWT_SECRET } from "../config/auth";
import { AppDataSource } from "../database/data-source";
import { User } from "../entities/User";
import { AuthService } from "./AuthService";

describe("AuthService", () => {
  const authService = new AuthService();

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
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("registers a user with a hashed password", async () => {
    // Arrange
    const input = {
      name: "  Zeynep Demirer  ",
      email: "  ZEYNEP@EXAMPLE.COM  ",
      password: "Zeynep123",
    };

    // Act
    const result = await authService.register(input);

    // Assert
    const userRepository = AppDataSource.getRepository(User);

    const savedUser = await userRepository.findOneByOrFail({
      id: result.user.id,
    });

    expect(result.user.name).toBe("Zeynep Demirer");

    expect(result.user.email).toBe("zeynep@example.com");

    expect(savedUser.passwordHash).not.toBe(input.password);

    await expect(compare(input.password, savedUser.passwordHash)).resolves.toBe(true);

    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("rejects registration with an existing email", async () => {
    // Arrange
    await authService.register({
      name: "First User",
      email: "user@example.com",
      password: "Password123",
    });

    // Act
    const registration = authService.register({
      name: "Second User",
      email: "USER@EXAMPLE.COM",
      password: "AnotherPassword123",
    });

    // Assert
    await expect(registration).rejects.toMatchObject({
      message: "An account with this email already exists",
      statusCode: 409,
    });
  });

  it("rejects a password shorter than eight characters", async () => {
    // Arrange
    const input = {
      name: "Test User",
      email: "short@example.com",
      password: "1234567",
    };

    // Act
    const registration = authService.register(input);

    // Assert
    await expect(registration).rejects.toMatchObject({
      message: "Password must contain at least 8 characters",
      statusCode: 400,
    });
  });

  it("logs in a registered user and returns a valid token", async () => {
    // Arrange
    const registered = await authService.register({
      name: "Login User",
      email: "login@example.com",
      password: "SecurePassword123",
    });

    // Act
    const result = await authService.login({
      email: "LOGIN@EXAMPLE.COM",
      password: "SecurePassword123",
    });

    // Assert
    expect(result.user.id).toBe(registered.user.id);

    expect(result.token).toEqual(expect.any(String));

    const decodedToken = verify(result.token, JWT_SECRET) as JwtPayload;

    expect(decodedToken.sub).toBe(String(registered.user.id));

    expect(decodedToken.email).toBe("login@example.com");
  });

  it("rejects login with an incorrect password", async () => {
    // Arrange
    await authService.register({
      name: "Login User",
      email: "login@example.com",
      password: "CorrectPassword123",
    });

    // Act
    const login = authService.login({
      email: "login@example.com",
      password: "WrongPassword123",
    });

    // Assert
    await expect(login).rejects.toMatchObject({
      message: "Email or password is incorrect",
      statusCode: 401,
    });
  });

  it("rejects login for an unknown email address", async () => {
    // Act
    const login = authService.login({
      email: "unknown@example.com",
      password: "Password123",
    });

    // Assert
    await expect(login).rejects.toMatchObject({
      message: "Email or password is incorrect",
      statusCode: 401,
    });
  });
});
