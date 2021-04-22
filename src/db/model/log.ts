// mongoDb
// 日志
type LogType = 'request' | 'behavior' | 'error'
export interface Log {
    id: string,
    type: LogType,
    data: any
}
