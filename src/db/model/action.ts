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
  userId?: string
  /**
   * 关联事务的id
   * 如wish的id
   */
  thingId?: string
  type: ActionType
  date: Date
  ip?: string
  data?: T
}

export type PraiseAction = Action
