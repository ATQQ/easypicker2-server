import { query } from '@/lib/dbConnect/mysql'
import { insertTableByModel, selectTableByModel, updateTableByModel } from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { OkPacket } from 'mysql'
import { BOOLEAN } from './model/public'
import { TaskInfo } from './model/taskInfo'

export function selectTaskInfo(options: TaskInfo) {
  const { sql, params } = selectTableByModel('task_info', {
    data: options,
  })
  return query<TaskInfo[]>(sql, ...params)
}

export function insertTaskInfo(taskInfo: TaskInfo) {
  const data: TaskInfo = {
    limitPeople: BOOLEAN.FALSE,
    template: '',
    rewrite: BOOLEAN.FALSE,
    format: '',
    info: JSON.stringify(['姓名']),
    shareKey: getUniqueKey(),
    ddl: null,
    ...taskInfo,
  }
  const { sql, params } = insertTableByModel('task_info', data)
  return query<OkPacket>(sql, ...params)
}

export function updateTaskInfo(taskInfo: TaskInfo, q: TaskInfo) {
  const { sql, params } = updateTableByModel('task_info', taskInfo, q)
  return query<OkPacket>(sql, ...params)
}
