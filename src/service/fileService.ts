import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { ObjectID } from 'mongodb'
import { In } from 'typeorm'
import QiniuService from './qiniuService'
import BehaviorService from './behaviorService'
import type { Files } from '@/db/entity'
import { FileRepository } from '@/db/fileDb'
import type { File } from '@/db/model/file'
import { publicError } from '@/constants/errorMsg'
import { batchFileStatus, createDownloadUrl, judgeFileIsExist, makeZipWithKeys } from '@/utils/qiniuUtil'
import { getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import LocalUserDB from '@/utils/user-local-db'
import { addDownloadAction, updateAction } from '@/db/actionDb'
import type { DownloadActionData } from '@/db/model/action'
import { ActionType, DownloadStatus } from '@/db/model/action'
import { getUniqueKey, normalizeFileName, shortLink } from '@/utils/stringUtil'
import { TaskRepository } from '@/db/taskDb'
import { UserRepository } from '@/db/userDb'
import { BOOLEAN } from '@/db/model/public'

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

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(UserRepository)
  private userRepository: UserRepository

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
      name: file.name,
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

  async batchDownload(ids: number[], zipName: string) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const files = await this.fileRepository.findMany({
      id: In(ids),
      userId,
    })
    if (files.length === 0) {
      this.behaviorService.add('file', `批量下载文件失败 用户:${logAccount}`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }
    let keys = []
    for (const file of files) {
      const { categoryKey } = file
      const key = this.getOssKey(file)
      if (!categoryKey) {
        keys.push(key)
      }
      // 兼容老板平台数据
      if (categoryKey) {
        const isOldExist = await judgeFileIsExist(categoryKey)
        if (isOldExist) {
          keys.push(categoryKey)
        }
        else {
          keys.push(key)
        }
      }
    }

    const filesStatus = await batchFileStatus(keys)
    let size = 0
    keys = keys.filter((_, idx) => {
      const { code } = filesStatus[idx]
      if (code === 200) {
        size += filesStatus[idx].data.fsize || 0
      }
      return code === 200
    })
    if (keys.length === 0) {
      this.behaviorService.add('file', `批量下载文件失败 用户:${logAccount} 文件均已从云上移除`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }

    const filename = normalizeFileName(zipName) ?? `${getUniqueKey()}`
    const value = await makeZipWithKeys(keys, filename)
    this.behaviorService.add('file', `批量下载任务 用户:${logAccount} 文件数量:${keys.length} 压缩任务名${value}`, {
      account: logAccount,
      length: keys.length,
      size,
    })

    await addDownloadAction({
      userId,
      type: ActionType.Compress,
      data: {
        status: DownloadStatus.ARCHIVE,
        ids,
        tip: `${filename}.zip (${keys.length}个文件)`,
        archiveKey: value,
      },
    })
    return {
      k: value,
    }
  }

  async downloadTemplate(filename: string, taskKey: string) {
    const k = `easypicker2/${taskKey}_template/${filename}`
    const isExist = await judgeFileIsExist(k)
    if (!isExist) {
      this.behaviorService.add('file', '下载模板文件 参数错误', {
        data: this.ctx.req.query,
      })
      throw publicError.file.notExist
    }

    // TODO: 统计下载次数和流量
    const task = await this.taskRepository.findOne({
      k: taskKey,
      del: BOOLEAN.FALSE,
    })

    if (!task) {
      this.behaviorService.add('file', '下载模板文件 参数错误', {
        data: this.ctx.req.query,
      })
      throw publicError.file.notExist
    }

    const user = await this.userRepository.findOne({
      id: task.userId,
    })

    const [fileInfo] = await batchFileStatus([k])
    const { mimeType, fsize } = fileInfo?.data || {}

    // 单个文件链接默认 1 分钟有效期，避免频繁重复下载
    const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)
    const originUrl = createDownloadUrl(k, expiredTime)

    const result = await addDownloadAction({
      userId: task.userId,
      type: ActionType.TemplateDownload,
      thingId: taskKey,
    })

    const link = shortLink(result.insertedId, this.ctx.req)
    const data: DownloadActionData = {
      url: link,
      originUrl,
      status: DownloadStatus.SUCCESS,
      ids: [],
      tip: filename,
      name: filename,
      size: fsize,
      account: user.account,
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
