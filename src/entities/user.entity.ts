import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  grade_id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone_number: string;

  @Column()
  birth: Date;

  /* 0: male, 1: female, 2: none */
  @Column()
  gender: number;

  /* 해시 처리된 패스워드 */
  @Column()
  password: string;

  /* 해시 처리된 패스워드 */
  @Column()
  auth_email: boolean;

  /* 레벨 (레벨 테이블 별도로 구성 필요) */
  @Column()
  level: number;

  /* 레벨 점수 */
  @Column()
  points: number;

  @Column()
  fail_login_count: number;

  @Column()
  last_login_at: Date;

  /* 
    login
    logout
    dormant (휴면)
  */
  @Column()
  status: string;

  /* date time */
  @DeleteDateColumn()
  deleted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}