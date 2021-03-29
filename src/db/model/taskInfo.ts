import { BOOLEAN } from './public'

export interface TaskInfo {
    id?: number
    task_id?: number
    taskId?: number
    template?: string
    rewrite?: BOOLEAN
    format?: string
    info?: string
    ddl?: Date
    share_key?: string
    shareKey?: string
    limit_people?: BOOLEAN
    limitPeople?: BOOLEAN
}