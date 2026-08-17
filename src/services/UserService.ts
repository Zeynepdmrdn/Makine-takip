import { AppDataSource } from "../database/data-source";
import { User, UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export class UserService {
  // Returns all users without exposing password hashes
  async getAllUsers(): Promise<SafeUser[]> {
    const userRepository = AppDataSource.getRepository(User);

    const users = await userRepository.find({
      order: {
        id: "ASC",
      },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  // Updates a user's role while protecting critical admin rules
  async updateUserRole(
    authenticatedUserId: number,
    targetUserId: number,
    role: UserRole,
  ): Promise<SafeUser> {
    if (authenticatedUserId === targetUserId) {
      throw new AppError("You cannot change your own role", 400);
    }

    const userRepository = AppDataSource.getRepository(User);

    const targetUser = await userRepository.findOneBy({
      id: targetUserId,
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUser.role === role) {
      throw new AppError(`User already has the ${role} role`, 400);
    }

    if (targetUser.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const adminCount = await userRepository.countBy({
        role: UserRole.ADMIN,
      });

      if (adminCount <= 1) {
        throw new AppError("The last administrator cannot be demoted", 400);
      }
    }

    targetUser.role = role;

    const savedUser = await userRepository.save(targetUser);

    return this.toSafeUser(savedUser);
  }

  // Removes sensitive authentication information from API responses
  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
