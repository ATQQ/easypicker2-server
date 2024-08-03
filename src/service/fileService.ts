import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { ObjectID, ObjectId } from 'mongodb'
import type { FindOptionsWhere } from 'typeorm'
import { In } from 'typeorm'
import QiniuService from './qiniuService'
import BehaviorService from './behaviorService'
import type { Files } from '@/db/entity'
import { FileRepository } from '@/db/fileDb'
import type { File } from '@/db/model/file'
import { publicError } from '@/constants/errorMsg'
import { batchFileStatus, createDownloadUrl, deleteObjByKey, judgeFileIsExist, makeZipWithKeys } from '@/utils/qiniuUtil'
import { getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import LocalUserDB from '@/utils/user-local-db'
import { addDownloadAction, findAction, updateAction } from '@/db/actionDb'
import type { DownloadActionData } from '@/db/model/action'
import { ActionType, DownloadStatus } from '@/db/model/action'
import { B2GB, formatPrice, getUniqueKey, normalizeFileName, shortLink } from '@/utils/stringUtil'
import { TaskRepository } from '@/db/taskDb'
import { UserRepository } from '@/db/userDb'
import { BOOLEAN } from '@/db/model/public'
import { findLog, timeToObjId } from '@/db/logDb'
import type { Log } from '@/db/model/log'
import type { DownloadLogAnalyzeItem } from '@/types'
import { diffMonth } from '@/utils/time-utils'

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

  async downloadCount(idList: number[]) {
    // 先获取 downloadAction
    // 筛选状态，不包含失败的
    const actions = await findAction({
      'userId': this.ctx.req.userInfo.id,
      'data.status': {
        $in: [DownloadStatus.ARCHIVE, DownloadStatus.SUCCESS, DownloadStatus.EXPIRED],
      },
      'data.ids': {
        $in: idList,
      },
    })

    // 再获取 action 对应的日志条数
    // 有日志就按照日志计算
    // @ts-expect-error
    const actionsIds = actions.map(v => v._id.toHexString())
    const logs = await findLog({
      'type': 'behavior',
      'data.info.data.downloadActionId': { $in: actionsIds },
    })

    const values = idList.map((fileId) => {
      const baseCount = actions
        .filter(v => v.data.ids?.includes(fileId))
        .reduce((pre, action) => {
          // @ts-expect-error
          const logCount = logs.filter(v => v.data?.info?.data?.downloadActionId === action._id.toHexString()).length
          return pre + (logCount || 1)
        }, 0)
      return baseCount
    })
    return values
  }

  async downloadLog(account = '', ops?: {
    startTime?: Date
    endTime?: Date
  }) {
    const { startTime, endTime } = ops || {}
    return findLog({
      ...(startTime || endTime) && {
        _id: {
          ...startTime && { $gte: new ObjectId(timeToObjId(startTime)) },
          ...endTime && { $lte: new ObjectId(timeToObjId(endTime)) },
        },
      },
      'type': 'behavior',
      'data.info.msg': { $regex: new RegExp(`^(下载文件成功 用户:${account}|归档下载文件成功 用户:${account}|下载模板文件 用户:${account})`) },
    })
  }

  getOSSFileSizeUntilNow(
    fileList: Files[],
    filesMap: Map<string, Qiniu.ItemInfo>,
    ops?: {
      startTime?: Date
    },
  ) {
    const { startTime } = ops || {}
    const sum = fileList.reduce((pre, file) => {
      const ossKey = this.getOssKey(file)
      const { categoryKey } = file
      const fileSize = +file.size
      const ossSize = (filesMap.get(ossKey) || filesMap.get(categoryKey))?.fsize || 0
      // 文件已经被删除
      if (!ossSize) {
        const { ossDelTime } = file
        // 不存在 删除时间 为存量数据，就算1月
        if (!ossDelTime) {
          return pre + fileSize
        }
        // 删除时间在统计时间之前，不计算
        if (ossDelTime < startTime) {
          return pre
        }
        // 存在 删除时间 说明是删除数据，按实际月数计算
        return pre + diffMonth(ossDelTime, startTime) * fileSize
      }
      // 文件没有被删除，按实际存在时间计算
      return pre + diffMonth(Date.now(), Math.max(+new Date(file.date), +startTime)) * fileSize
    }, 0)
    return Math.round(sum)
  }

  analyzeDownloadLog(logs: Log[]) {
    const oneFile = {
      count: 0,
      size: 0,
    }
    const compressFile = {
      count: 0,
      size: 0,
    }

    const templateFile = {
      count: 0,
      size: 0,
    }

    logs.forEach((v) => {
      const { info } = v.data
      const { msg } = info
      const size = +info.data.size || 0
      if (msg.startsWith('下载文件成功 用户:')) {
        oneFile.count += 1
        oneFile.size += size
      }
      else if (msg.startsWith('归档下载文件成功 用户:')) {
        compressFile.count += 1
        compressFile.size += size
      }
      else if (msg.startsWith('下载模板文件 用户:')) {
        templateFile.count += 1
        templateFile.size += size
      }
    })
    return {
      oneFile,
      compressFile,
      templateFile,
    }
  }

  /**
   * 通过空间判断是否限制上传
   * @param limitSize 可用空间
   * @param fileSize 已用空间
   */
  limitUploadBySpace(limitSize: number, fileSize: number) {
    return limitSize === 0 || limitSize < fileSize
  }

  calculateQiniuPrice(download: {
    one: DownloadLogAnalyzeItem
    compress: DownloadLogAnalyzeItem
    template: DownloadLogAnalyzeItem
  }, ossSize: number) {
    const { qiniuBackhaulTrafficPercentage, qiniuCompressPrice, qiniuBackhaulTrafficPrice, qiniuOSSPrice, qiniuCDNPrice } = LocalUserDB.getSiteConfig()
    // 存储费用
    const OSSPrice = B2GB(ossSize) * qiniuOSSPrice
    // 压缩费用
    const compressPrice = B2GB(download.compress.size) * qiniuCompressPrice
    // 回源费用
    const backhaulTrafficPrice = B2GB(ossSize) * qiniuBackhaulTrafficPercentage * qiniuBackhaulTrafficPrice
    // CDN 费用
    const cdnPrice = B2GB(
      download.one.size
      + download.compress.size
      + download.template.size,
    ) * qiniuCDNPrice

    return {
      ossPrice: formatPrice(OSSPrice),
      compressPrice: formatPrice(compressPrice),
      backhaulTrafficPrice: formatPrice(backhaulTrafficPrice),
      cdnPrice: formatPrice(cdnPrice),
      total: formatPrice(
        +formatPrice(OSSPrice)
        + +formatPrice(compressPrice)
        + +formatPrice(backhaulTrafficPrice)
        + +formatPrice(cdnPrice),
      ),
    }
  }

  addFile(file: Files) {
    file.name = normalizeFileName(file.name)
    file.date = new Date()
    return this.fileRepository.insert(file)
  }

  async getUserFiles() {
    const { id } = this.ctx.req.userInfo
    const files = await this.fileRepository.findMany({
      userId: id,
      del: BOOLEAN.FALSE,
    }, { order: { id: 'DESC' } })
    return files
  }

  async findOneFile(ops: FindOptionsWhere<Files>) {
    return this.fileRepository.findOne({
      del: BOOLEAN.FALSE,
      ...ops,
    })
  }

  async deleteOneFile(file: Files) {
    const { account: logAccount } = this.ctx.req.userInfo
    if (!file) {
      this.behaviorService.add('file', `删除文件失败 用户:${logAccount} 文件记录不存在`, {
        account: logAccount,
        fileId: file.id,
      })
      throw publicError.file.notExist
    }
    let k = `easypicker2/${file.taskKey}/${file.hash}/${file.name}`
    // 兼容旧路径的逻辑
    if (file.categoryKey) {
      k = file.categoryKey
    }
    const sameRecord = await this.fileRepository.findMany({
      taskKey: file.taskKey,
      hash: file.hash,
      name: file.name,
      del: BOOLEAN.FALSE,
    })

    const isRepeat = sameRecord.length > 1

    // 存在相同文件时，存储上共用一份数据，不能删除OSS资源
    if (!isRepeat) {
      // 删除OSS上文件
      deleteObjByKey(k)
    }
    file.ossDelTime = new Date()
    file.del = BOOLEAN.TRUE
    file.delTime = new Date()
    await this.fileRepository.update(file)
    this.behaviorService.add('file', `删除文件提交记录成功 用户:${logAccount} 文件:${file.name} ${
        isRepeat ? `还存在${sameRecord.length - 1}个重复文件` : '删除OSS资源'
      }`, {
      account: logAccount,
      name: file.name,
      taskKey: file.taskKey,
      hash: file.hash,
    })
  }
}
