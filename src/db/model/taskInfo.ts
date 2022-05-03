import { BOOLEAN } from './public'

export interface TaskInfo {
    id?: number
    user_id?: number
    userId?: number
    task_key?: string
    taskKey?: string
    template?: string
    rewrite?: BOOLEAN
    format?: string
    info?: string
    ddl?: Date
    share_key?: string
    shareKey?: string
    limit_people?: BOOLEAN
    limitPeople?: BOOLEAN
    tip?: string
}
