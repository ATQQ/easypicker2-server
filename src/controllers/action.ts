import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
  Get,
  Put,
  ReqParams,
  Response
} from 'flash-wolves'
import { FilterQuery } from 'mongodb'
import { Wish, WishStatus } from '@/db/model/wish'
import { addWishData, findWish, updateWish } from '@/db/wishDb'
import { getObjectIdDate, getUniqueKey } from '@/utils/stringUtil'
import { addBehavior } from '@/db/logDb'
import { User, USER_POWER } from '@/db/model/user'
import { ReqIp, ReqUserInfo } from '@/decorator'
import {
  addAction,
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
import { checkFopTaskStatus, createDownloadUrl } from '@/utils/qiniuUtil'

@RouterController('action', {
  needLogin: true
})
export default class ActionController {
  @Get('download/list')
  async getDownloadActionList(
    @ReqUserInfo() user: User,
    // TODO:支持传入默认值
    @ReqBody('pageSize') size,
    @ReqBody('pageIndex') index
  ) {
    size = size ?? 3
    index = index ?? 1
    const query: FilterQuery<Action> = {
      $or: [{ type: ActionType.Download }, { type: ActionType.Compress }],
      userId: user.id
    }
    const count = await findActionCount(query)
    const actions: DownloadAction[] = await findActionWithPageOffset(
      (index - 1) * size,
      size,
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
    return {
      sum: count,
      pageIndex: index,
      pageSize: size,
      actions: actions.map((v) => ({
        id: v.id,
        type: v.type,
        status: v.data.status,
        url: v.data.url,
        tip: v.data.tip
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
      tip: v.data.tip
    }))
  }
}
