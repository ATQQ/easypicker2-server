import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class User {
  @PrimaryGeneratedColumn({ type: 'int', comment: '唯一标识' })
  id: number

  @Column('varchar', { length: 64, nullable: true, comment: '用于登录的账号' })
  account: string

  @Column('varchar', { length: 22, nullable: true, comment: '手机号' })
  phone: string

  @Column('varchar', { length: 256, comment: '密码' })
  password: string

  @Column('tinyint', { default: 6, comment: '账户权限' })
  power: number

  @Column('tinyint', { default: 0, comment: '账户状态' })
  status: number

  @Column('timestamp', {
    default: () => 'CURRENT_TIMESTAMP',
    comment: '注册时间'
  })
  joinTime: Date

  @Column('timestamp', { nullable: true, comment: '最后登录时间' })
  loginTime: Date

  @Column('int', { default: 1, comment: '登录次数' })
  loginCount: number

  @Column('timestamp', { nullable: true, comment: '解封时间' })
  openTime: Date
}
