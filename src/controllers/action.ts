import { RouterController, Post, ReqBody, Get, ReqQuery } from 'flash-wolves'
import { FilterQuery } from 'mongodb'
import { User } from '@/db/model/user'
import { ReqUserInfo } from '@/decorator'
import {
  findAction,
  findActionCount,
  findActionWithPageOffset,
  updateAction
} from '@/db/actionDb'
import {
  Action,
  ActionType,
  DownloadAction,
  DownloadActionData,
  DownloadStatus
} from '@/db/model/action'
import {
  checkFopTaskStatus,
  createDownloadUrl,
  getOSSFiles
} from '@/utils/qiniuUtil'

@RouterController('action', {
  needLogin: true
})
export default class ActionController {
  @Post('download/list')
  async getDownloadActionList(
    @ReqUserInfo() user: User,
    // TODO:支持传入默认值
    @ReqBody('pageSize') size: string,
    @ReqBody('pageIndex') index: string,
    @ReqBody('extraIds') ids: string[]
  ) {
    const pageIndex = +(index ?? 1)
    const extraIds = ids ?? []
    const pageSize = Math.max(+(size ?? 3), extraIds.length)

    const query: FilterQuery<Action> = {
      $or: [
        ...extraIds.map((e) => ({ id: e })),
        { type: ActionType.Download },
        { type: ActionType.Compress }
      ],
      userId: user.id
    }
    const count = await findActionCount(query)
    const actions: DownloadAction[] = await findActionWithPageOffset(
      (pageIndex - 1) * pageSize,
      pageSize,
      query
    )
    // 校验是否有效
    const now = Date.now()
    const expiredHours = 12
    const oneHour = 1000 * 60 * 60
    for (const action of actions) {
      let needUpdate = false
      // 检查是否过期
      if (action.data.status === DownloadStatus.SUCCESS) {
        const pass = Math.floor((now - +action.date) / oneHour)
        if (pass >= expiredHours) {
          action.data.status = DownloadStatus.EXPIRED
          needUpdate = true
        }
      }

      // 检查归档是否完成
      if (action.data.status === DownloadStatus.ARCHIVE) {
        const data = await checkFopTaskStatus(action.data.archiveKey)
        if (data.code === 0) {
          const [fileInfo] = await getOSSFiles(data.key)
          action.data.status = DownloadStatus.SUCCESS
          action.data.url = createDownloadUrl(data.key)
          action.data.size = fileInfo.fsize
          needUpdate = true
        }
      }
      // 异步更新落库
      if (needUpdate) {
        updateAction<DownloadActionData>(
          { id: action.id },
          {
            $set: {
              data: {
                ...action.data
              }
            }
          }
        )
      }
    }

    // 获取文件信息
    return {
      sum: count,
      pageIndex: index,
      pageSize: size,
      actions: actions.map((v) => ({
        id: v.id,
        type: v.type,
        status: v.data.status,
        url: v.data.url,
        tip: v.data.tip,
        date: +v.date,
        size: v.data.size
      }))
    }
  }

  @Post('download/status')
  async checkCompressTaskStatus(
    @ReqUserInfo() user: User,
    @ReqBody('ids') actionIds: string[]
  ) {
    if (!actionIds) {
      return {}
    }
    const actions = await findAction<DownloadActionData>({
      userId: user.id,
      $or: actionIds.map((v) => ({ id: v }))
    })
    for (const action of actions) {
      let needUpdate = false
      // 检查归档是否完成
      if (action.data.status === DownloadStatus.ARCHIVE) {
        const data = await checkFopTaskStatus(action.data.archiveKey)
        if (data.code === 0) {
          action.data.status = DownloadStatus.SUCCESS
          action.data.url = createDownloadUrl(data.key)
          needUpdate = true
        }
      }
      // 异步更新落库
      if (needUpdate) {
        updateAction<DownloadActionData>(
          { id: action.id },
          {
            $set: {
              data: {
                ...action.data
              }
            }
          }
        )
      }
    }
    return actions.map((v) => ({
      id: v.id,
      type: v.type,
      status: v.data.status,
      url: v.data.url,
      tip: v.data.tip,
      date: +v.date
    }))
  }
}
