import { User } from '@/entities/user.entity';
import { Repository } from 'typeorm';
import { database } from './database';
import { CreateUserDto } from '@/dto/create-user.dto';
import { UpdateUserDto } from '@/dto/update-user.dto';

export class UserManager {
  constructor(
    private readonly userRepository: Repository<User> = database.getRepository(
      User,
    ),
  ) {
    console.log('connect user manager');
  }
  findAllUsers() {
    return this.userRepository.find();
  }
  findOneUserById(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }
  findOneUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }
  createUser(createUserDto: CreateUserDto) {
    return this.userRepository.insert(createUserDto);
  }
  updateUser(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }
  softDeleteUser(id: number) {
    return this.userRepository.softDelete({ id });
  }
  deleteUser(id: number) {
    return this.userRepository.delete({ id });
  }
  restoreUser(id: number) {
    return this.userRepository.restore({ id });
  }
}
