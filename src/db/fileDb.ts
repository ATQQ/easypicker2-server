import { query } from '@/lib/dbConnect/mysql'
import { deleteTableByModel, insertTableByModel, selectTableByModel, updateTableByModel } from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { OkPacket } from 'mysql'
import { File } from './model/file'
import { Task } from './model/task'
import { insertTaskInfo } from './taskInfoDb'

export function insertFile(file:File) {
    const { sql, params } = insertTableByModel('files', file)
    return query<OkPacket>(sql, ...params)
}

export function selectFiles(options: File) {
    const { sql, params } = selectTableByModel('files', {
        data: options
    })
    return query<File[]>(sql, ...params)
}

// export function deleteTask(task: Task) {
//     const { sql, params } = deleteTableByModel('task', task)
//     return query<OkPacket>(sql, ...params)
// }

// export function updateTask(task: Task, q: Task) {
//     const { sql, params } = updateTableByModel('task', task, q)
//     return query<OkPacket>(sql, ...params)
// }