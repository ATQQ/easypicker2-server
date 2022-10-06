export enum ActionType {
  /**
   * 点赞
   */
  PRAISE,

  /**
   * 文件下载
   */
  Download,

  /**
   * 文件归档
   */
  Compress,

  /**
   * 路由禁用
   */
  DisabledRoute
}
export interface Action<T = any> {
  id: string
  type: ActionType
  date: Date
  userId?: string | number
  /**
   * 关联事务的id
   * 如wish的id
   */
  thingId?: string | number
  ip?: string
  data?: T
}

export type PraiseAction = Action

export enum DownloadStatus {
  /**
   * 归档中
   */
  ARCHIVE,
  /**
   * 链接已失效
   */
  EXPIRED,
  /**
   * 可下载
   */
  SUCCESS
}
export interface DownloadActionData {
  url?: string
  status: DownloadStatus
  ids: number[]
  archiveKey?: string
  tip?: string
}

export type DownloadAction = Action<DownloadActionData>
