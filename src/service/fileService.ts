import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { ObjectID } from 'mongodb'
import QiniuService from './qiniuService'
import BehaviorService from './behaviorService'
import type { Files } from '@/db/entity'
import { FileRepository } from '@/db/fileDb'
import type { File } from '@/db/model/file'
import { publicError } from '@/constants/errorMsg'
import { batchFileStatus, createDownloadUrl, judgeFileIsExist } from '@/utils/qiniuUtil'
import { getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import LocalUserDB from '@/utils/user-local-db'
import { addDownloadAction, updateAction } from '@/db/actionDb'
import type { DownloadActionData } from '@/db/model/action'
import { ActionType, DownloadStatus } from '@/db/model/action'
import { shortLink } from '@/utils/stringUtil'

@Provide()
export default class FileService {
  @InjectCtx()
  private ctx: Context

  @Inject(FileRepository)
  private fileRepository: FileRepository

  @Inject(QiniuService)
  private qiniuService: QiniuService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  async selectFilesLimitCount(options: Partial<Files>, count: number) {
    return this.fileRepository.findWithLimitCount(options, count, {
      id: 'DESC',
    })
  }

  getOssKey(file: File) {
    return `easypicker2/${file.task_key || file.taskKey}/${file.hash}/${
      file.name
    }`
  }

  /**
   * 实际文件用了
   */
  async getFileUsage(userId: number) {
    // 获取用户实际的文件
    const files = await this.fileRepository.findMany({
      userId,
    })

    // 获取 OSS
    const ossFilesMap = await this.qiniuService.getFilesMap(files)

    return files.reduce((pre, file) => {
      const ossKey = this.getOssKey(file)
      const { categoryKey } = file

      return (
        pre
        + ((ossFilesMap.get(ossKey) || ossFilesMap.get(categoryKey))?.fsize || 0)
      )
    }, 0)
  }

  async downloadOne(fileId: number) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const file = await this.fileRepository.findOne({
      userId,
      id: fileId,
    })

    if (!file) {
      this.behaviorService.add('file', `下载文件失败 用户:${logAccount} 文件记录不存在`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }
    let k = this.getOssKey(file)
    let isExist = false
    // 兼容旧路径的逻辑
    if (file.categoryKey) {
      isExist = await judgeFileIsExist(file.categoryKey)
    }

    if (!isExist) {
      isExist = await judgeFileIsExist(k)
    }
    else {
      k = file.categoryKey
    }

    if (!isExist) {
      this.behaviorService.add('file', `下载文件失败 用户:${logAccount} 文件:${file.name} 已从云上移除`, {
        account: logAccount,
        name: file.name,
      })

      throw publicError.file.notExist
    }

    const status = await batchFileStatus([k])
    const mimeType = status[0]?.data?.mimeType
    // 新日志记录在重定向链接中
    // this.behaviorService.add('file', `下载文件成功 用户:${logAccount} 文件:${file.name} 类型:${mimeType}`, {
    //   account: logAccount,
    //   name: file.name,
    //   mimeType,
    //   size: file.size,
    // })

    // 单个文件链接默认 1 分钟有效期，避免频繁重复下载
    const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)
    const originUrl = createDownloadUrl(k, expiredTime)

    const result = await addDownloadAction({
      userId,
      type: ActionType.Download,
      thingId: file.id,
    })

    const link = shortLink(result.insertedId, this.ctx.req)
    const data: DownloadActionData = {
      url: link,
      originUrl,
      status: DownloadStatus.SUCCESS,
      ids: [file.id],
      tip: file.name,
      size: file.size,
      account: logAccount,
      mimeType,
      expiredTime: expiredTime * 1000,
    }

    await updateAction<DownloadActionData>(
      { _id: ObjectID(result.insertedId) },
      {
        $set: {
          data,
        },
      },
    )
    return {
      link,
      mimeType,
    }
  }
}
