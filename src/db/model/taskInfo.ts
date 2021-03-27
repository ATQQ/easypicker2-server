enum Rewrite {
    NO,
    YES
}
export interface taskInfo {
    id?: number
    task_id?: number
    taskId?: number
    template?: string
    rewrite?: Rewrite
    format?: string
    info?: string
    ddl?: Date
    share_key?: string
    shareKey?: string
}