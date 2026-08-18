import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { User, UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";

export interface SafeAssignedMachine {
  id: number;
  name: string;
  code: string;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  assignedMachines: SafeAssignedMachine[];
}

export class UserService {
  // Returns all users without exposing password hashes
  async getAllUsers(): Promise<SafeUser[]> {
    const userRepository = AppDataSource.getRepository(User);

    const users = await userRepository.find({
      relations: {
        assignedMachines: true,
      },
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

    const targetUser = await userRepository.findOne({
      where: {
        id: targetUserId,
      },
      relations: {
        assignedMachines: true,
      },
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

    // Machine assignments are meaningful only for operators
    if (role !== UserRole.OPERATOR) {
      targetUser.assignedMachines = [];
    }

    const savedUser = await userRepository.save(targetUser);

    return this.toSafeUser(savedUser);
  }

  // Assigns one machine to an operator
  async assignMachine(targetUserId: number, machineId: number): Promise<SafeUser> {
    const userRepository = AppDataSource.getRepository(User);

    const machineRepository = AppDataSource.getRepository(Machine);

    const targetUser = await userRepository.findOne({
      where: {
        id: targetUserId,
      },
      relations: {
        assignedMachines: true,
      },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUser.role !== UserRole.OPERATOR) {
      throw new AppError("Machines can only be assigned to operators", 400);
    }

    const machine = await machineRepository.findOneBy({
      id: machineId,
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    const alreadyAssigned = targetUser.assignedMachines.some(
      (assignedMachine) => assignedMachine.id === machine.id,
    );

    if (alreadyAssigned) {
      throw new AppError("Machine is already assigned to this operator", 400);
    }

    targetUser.assignedMachines.push(machine);

    const savedUser = await userRepository.save(targetUser);

    return this.toSafeUser(savedUser);
  }

  // Removes one machine assignment from an operator
  async removeMachineAssignment(targetUserId: number, machineId: number): Promise<SafeUser> {
    const userRepository = AppDataSource.getRepository(User);

    const targetUser = await userRepository.findOne({
      where: {
        id: targetUserId,
      },
      relations: {
        assignedMachines: true,
      },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUser.role !== UserRole.OPERATOR) {
      throw new AppError("Machine assignments only belong to operators", 400);
    }

    const assignmentExists = targetUser.assignedMachines.some(
      (machine) => machine.id === machineId,
    );

    if (!assignmentExists) {
      throw new AppError("Machine is not assigned to this operator", 404);
    }

    targetUser.assignedMachines = targetUser.assignedMachines.filter(
      (machine) => machine.id !== machineId,
    );

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
      assignedMachines: (user.assignedMachines ?? []).map((machine) => ({
        id: machine.id,
        name: machine.name,
        code: machine.code,
      })),
    };
  }
}
