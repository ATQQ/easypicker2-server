import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class TaskInfo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  @Column('int', { name: 'user_id', comment: '关联user_id' })
  userId: number

  @Column('varchar', {
    length: 256,
    name: 'task_key',
    comment: '关联任务的key'
  })
  taskKey: string

  @Column('varchar', { length: 1024, nullable: true, comment: '模板文件名称' })
  template: string | null

  @Column('tinyint', { comment: '自动重命名', default: 0 })
  rewrite: number

  @Column('varchar', { length: 1024, nullable: true, comment: '文件名格式' })
  format: string | null

  @Column('varchar', {
    length: 10240,
    nullable: true,
    comment: '提交必填的内容(表单)'
  })
  info: string | null

  @Column('timestamp', { nullable: true, comment: '截止日期' })
  ddl: Date | null

  @Column('varchar', { length: 128, comment: '用于分享的链接' })
  shareKey: string

  @Column('tinyint', { comment: '是否限制提交人员', default: 0 })
  limitPeople: number

  @Column('text', { nullable: true })
  tip: string
}
