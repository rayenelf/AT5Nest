import { ObjectId } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UserService {
  // Créer un utilisateur avec vérification de doublon (email unique)
  async createUser(userDto: Partial<User>): Promise<User> {
    // On suppose que le contrôleur a déjà vérifié l'unicité de l'email
    const user = this.userRepository.create(userDto);
    return this.userRepository.save(user);
  }

  // Trouver un utilisateur par id
  async findById(id: string): Promise<User | null> {
    // MongoDB: id est un ObjectId
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.userRepository.findOne({ where: { id: objectId } });
  }

  // Mettre à jour un utilisateur
  async updateUser(id: string, updateDto: Partial<User>): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const before = await this.userRepository.findOne({
      where: { id: objectId },
    });
    await this.userRepository.update({ id: objectId }, updateDto);
    const after = await this.userRepository.findOne({
      where: { id: objectId },
    });

    // Journalisation simple des modifications
    if (before && after) {
      const changed: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(updateDto)) {
        const prev = (before as unknown as Record<string, unknown>)[key];
        const next = (after as unknown as Record<string, unknown>)[key];
        if (prev !== next) changed[key] = { from: prev, to: next };
      }
      if (Object.keys(changed).length > 0) {
        console.log('User updated changes:', { id, changed });
      }
    }
    return after;
  }

  // Supprimer un utilisateur
  async deleteUser(id: string): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const res = await this.userRepository.delete({ id: objectId });
    return !!res.affected && res.affected > 0;
  }

  // Désactiver les comptes inactifs depuis plus d'un an (basé sur updatedAt)
  async deactivateInactiveSinceOneYear(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const result = await this.userRepository.updateMany(
      { updatedAt: { $lt: oneYearAgo } },
      { $set: { isActive: false } },
    );
    return (
      (result as unknown as { modifiedCount?: number })?.modifiedCount || 0
    );
  }

  // Mettre à jour en masse le rôle des utilisateurs d'un domaine email
  async bulkUpdateRoleByEmailDomain(
    domain: string,
    role: UserRole,
  ): Promise<number> {
    const result = await this.userRepository.updateMany(
      { email: { $regex: new RegExp(`@${domain}$`, 'i') } },
      { $set: { role } },
    );
    return (
      (result as unknown as { modifiedCount?: number })?.modifiedCount || 0
    );
  }
  constructor(
    @InjectRepository(User)
    private readonly userRepository: MongoRepository<User>,
  ) {}

  // Pagination et tri simple
  async findPaginatedAndSorted(
    page = 1,
    limit = 10,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
  ): Promise<User[]> {
    const skip = (page - 1) * limit;
    return this.userRepository.find({
      order: sort,
      skip,
      take: limit,
    });
  }

  // 1. Récupérer utilisateurs sans champs sensibles selon rôle
  async findAllFilteredByRole(role: UserRole): Promise<any[]> {
    const users = await this.userRepository.find();
    if (role === UserRole.ADMIN) {
      return users;
    }
    // Pour client, inclure seulement id et email
    return users.map(({ id, email }) => ({ id, email }));
  }

  // 2. Utilisateurs non mis à jour depuis 6 mois
  async findNotUpdatedSince6Months(): Promise<User[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return this.userRepository.find({
      where: {
        updatedAt: { $lt: sixMonthsAgo },
      },
    });
  }

  // 3. Utilisateurs par domaine email
  async findByEmailDomain(domain: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        email: { $regex: `@${domain}$`, $options: 'i' },
      },
    });
  }

  // 4. Utilisateurs créés dans les 7 derniers jours
  async findCreatedLast7Days(): Promise<User[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.userRepository.find({
      where: {
        createdAt: { $gte: sevenDaysAgo },
      },
    });
  }

  // 5. Compter utilisateurs par rôle (group by)
  async countByRole(): Promise<any[]> {
    return this.userRepository
      .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
      .toArray();
  }

  // 6. Utilisateurs créés entre deux dates
  async findCreatedBetween(date1: Date, date2: Date): Promise<User[]> {
    return this.userRepository.find({
      where: {
        createdAt: { $gte: date1, $lte: date2 },
      },
    });
  }

  // 7. Utilisateurs les plus récents
  async findMostRecent(limit = 10): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async averageDaysBetweenCreatedAndUpdated(): Promise<number> {
    const pipeline = [
      {
        $project: {
          diffDays: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$diffDays' },
        },
      },
    ];
    type AvgResult = { _id: null; avgDays?: number };
    const result = (await this.userRepository
      .aggregate(pipeline)
      .toArray()) as AvgResult[];
    if (
      Array.isArray(result) &&
      result.length > 0 &&
      typeof result[0].avgDays === 'number'
    ) {
      return result[0].avgDays;
    }
    return 0;
  }
}
