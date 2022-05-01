import type { Category } from '@/db/model/category'
import type { File } from '@/db/model/file'
import type { TaskInfo } from '@/db/model/taskInfo'
import type { Task } from '@/db/model/task'
import type { People } from '@/db/model/people'
import type { User } from '@/db/model/user'
import { query } from '@/lib/dbConnect/mysql'

type TableName = 'task_info' | 'category' | 'files' | 'task' | 'people' | 'user'
type DBTables = {
    'task_info': TaskInfo
    'category': Category
    'files': File
    'task': Task
    'people': People
    'user': User
}

interface TableField<T extends TableName> {
    /**
     * 字段名
     */
    fieldName: keyof DBTables[T],
    /**
     * 字段类型
     */
    fieldType: string
    /**
     * 默认值
     */
    defaultValue: string | number
    /**
     * 字段释义
     */
    comment: string
}
async function addTableField<T extends TableName>(tableName:T, field: TableField<T>) {
  const {
    fieldName, defaultValue, comment, fieldType,
  } = field
  const { count } = (await query('SELECT count(*) as count FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ?', tableName, `${fieldName}`))[0]
  if (count === 0) {
    console.log(`添加字段 ${tableName}.${fieldName}`)
    console.log(`ALTER TABLE ${tableName} ADD COLUMN ${fieldName} ${fieldType} DEFAULT ${defaultValue} COMMENT '${comment}'`)
    // eslint-disable-next-line max-len
    console.log(await query(`ALTER TABLE ${tableName} ADD COLUMN ${fieldName} ${fieldType} DEFAULT ${defaultValue} COMMENT '${comment}'`))
  }
}

export default async function patchTable() {
  addTableField('task_info', {
    fieldName: 'tip',
    fieldType: 'varchar(1024)',
    comment: '批注信息',
    defaultValue: '\'\'',
  })
}
