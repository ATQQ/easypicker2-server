import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class Hello {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number

  @Column('int', { name: 'user_id' })
  userId: number

  @Column('varchar', { name: 'category_key', comment: '所属分类' })
  categoryKey: string

  @Column('varchar')
  name: string

  @Column('varchar')
  k: string

  @Column('tinyint')
  del: number
}
