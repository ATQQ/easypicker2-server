import { query } from '@/lib/dbConnect/mysql'
import {
  deleteTableByModel, insertTableByModel, selectTableByModel, updateTableByModel,
} from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { OkPacket } from 'mysql'
import { Task } from './model/task'
import { insertTaskInfo } from './taskInfoDb'

export function insertTask(task: Task) {
  const data = { k: getUniqueKey(), ...task }
  const { sql, params } = insertTableByModel('task', data)
  // 新增附加属性
  insertTaskInfo({
    taskKey: data.k,
    userId: data.userId,
  })
  return query<OkPacket>(sql, ...params)
}

export function selectTasks(options: Task) {
  const { sql, params } = selectTableByModel('task', {
    data: options,
  })
  return query<Task[]>(sql, ...params)
}

export function deleteTask(task: Task) {
  const { sql, params } = deleteTableByModel('task', task)
  return query<OkPacket>(sql, ...params)
}

export function updateTask(task: Task, q: Task) {
  const { sql, params } = updateTableByModel('task', task, q)
  return query<OkPacket>(sql, ...params)
}
