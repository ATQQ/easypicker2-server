export type UserConfigType =
  | 'mysql'
  | 'redis'
  | 'mongo'
  | 'qiniu'
  | 'server'
  | 'tx'
export interface UserConfig {
  type: UserConfigType
  key: string
  value: string | string | boolean
  isSecret: boolean
  lastUpdate?: Date
  originData?: Record<string, any>
}
