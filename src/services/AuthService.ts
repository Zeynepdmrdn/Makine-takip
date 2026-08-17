import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth";
import { AppDataSource } from "../database/data-source";
import { User, UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  token: string;
}

export class AuthService {
  // Registers a new operator and returns an authentication token
  async register(input: RegisterInput): Promise<AuthenticationResult> {
    const userRepository = AppDataSource.getRepository(User);

    const normalizedName = input.name.trim();
    const normalizedEmail = input.email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      throw new AppError("Name must contain at least 2 characters", 400);
    }

    if (!this.isValidEmail(normalizedEmail)) {
      throw new AppError("A valid email address is required", 400);
    }

    if (input.password.length < 8) {
      throw new AppError("Password must contain at least 8 characters", 400);
    }

    const existingUser = await userRepository.findOneBy({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new AppError("An account with this email already exists", 409);
    }

    const passwordHash = await hash(input.password, 12);

    const user = userRepository.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: UserRole.VIEWER,
    });

    const savedUser = await userRepository.save(user);

    return this.createAuthenticationResult(savedUser);
  }

  // Verifies credentials and returns an authentication token
  async login(input: LoginInput): Promise<AuthenticationResult> {
    const userRepository = AppDataSource.getRepository(User);

    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await userRepository.findOneBy({
      email: normalizedEmail,
    });

    if (!user) {
      throw new AppError("Email or password is incorrect", 401);
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Email or password is incorrect", 401);
    }

    return this.createAuthenticationResult(user);
  }

  // Creates the safe user response and signed JWT
  private createAuthenticationResult(user: User): AuthenticationResult {
    const token = sign(
      {
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: JWT_EXPIRES_IN,
      },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
