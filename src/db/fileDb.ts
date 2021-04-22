import { query } from '@/lib/dbConnect/mysql'
import { deleteTableByModel, insertTableByModel, selectTableByModel, updateTableByModel } from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { OkPacket } from 'mysql'
import { File } from './model/file'
import { Task } from './model/task'
import { insertTaskInfo } from './taskInfoDb'

export function insertFile(file: File) {
    const { sql, params } = insertTableByModel('files', file)
    return query<OkPacket>(sql, ...params)
}

export function selectFiles(options: File) {
    const { sql, params } = selectTableByModel('files', {
        data: options
    })
    return query<File[]>(sql, ...params)
}

export function deleteFileRecord(file: File) {
    // 逻辑删
    const originData = JSON.stringify({
        userId: file.user_id,
        categoryKey: file.category_key,
        taskKey: file.task_key
    })
    const { sql, params } = updateTableByModel('files', {
        userId: 0,
        taskKey:'local_trash',
        categoryKey: originData
    }, {
        id: file.id
    })
    // 物理删
    // const { sql, params } = deleteTableByModel('files', file)
    return query<OkPacket>(sql, ...params)
}

export function deleteFiles(files:File[]) {
    const ids = files.map(v=>v.id)
    // 逻辑删
    const { sql, params } = updateTableByModel('files', {
        userId: 0,
        taskKey:'local_trash',
    }, {
        id: ids
    })
    // 异步办事
    ;(async()=>{
        for (const f of files) {
            await deleteFileRecord(f)
        }
    })()
    return query<OkPacket>(sql, ...params)
}