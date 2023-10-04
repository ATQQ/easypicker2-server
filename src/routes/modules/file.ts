import { Router } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import {
  deleteFileRecord,
  deleteFiles,
  insertFile,
  selectFiles
} from '@/db/fileDb'
import { addBehavior, addErrorLog } from '@/db/logDb'
import { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'

import {
  batchDeleteFiles,
  batchFileStatus,
  checkFopTaskStatus,
  createDownloadUrl,
  deleteObjByKey,
  getUploadToken,
  judgeFileIsExist,
  makeZipWithKeys
} from '@/utils/qiniuUtil'
import { getUniqueKey, isSameInfo, normalizeFileName } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'
import { addDownloadAction } from '@/db/actionDb'
import { ActionType, DownloadStatus } from '@/db/model/action'

const router = new Router('file')

/**
 * 获取上传令牌
 */
router.get('token', (req, res) => {
  const token = getUploadToken()
  addBehavior(req, {
    module: 'file',
    msg: '获取文件上传令牌'
  })
  res.success({
    token
  })
})

/**
 * 记录提交的文件信息
 */
router.post('info', async (req, res) => {
  const data: File = req.body
  const [task] = await selectTasks({
    k: data.taskKey
  })
  if (!task) {
    addBehavior(req, {
      module: 'file',
      msg: '提交文件: 参数错误',
      data
    })
    res.failWithError(publicError.request.errorParams)
    return
  }
  const { user_id } = task
  Object.assign<File, File>(data, {
    user_id,
    date: new Date(),
    categoryKey: '',
    people: data.people || '',
    originName: data.originName || ''
  })
  data.name = normalizeFileName(data.name)
  await insertFile(data)
  addBehavior(req, {
    module: 'file',
    msg: `提交文件: 文件名:${data.name} 成功`,
    data
  })
  res.success()
})

/**
 * 获取文件列表
 */
router.get(
  'list',
  async (req, res) => {
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const files = await selectFiles({
      userId
    })
    // 逆序
    addBehavior(req, {
      module: 'file',
      msg: `获取文件列表 用户:${logAccount} 成功`,
      data: {
        logAccount
      }
    })
    res.success({
      files
    })
  },
  {
    needLogin: true
  }
)

/**
 * 获取模板文件下载链接
 */
router.get('template', async (req, res) => {
  const { template, key } = req.query
  const k = `easypicker2/${key}_template/${template}`
  const isExist = await judgeFileIsExist(k)
  if (!isExist) {
    addBehavior(req, {
      module: 'file',
      msg: '下载模板文件 参数错误',
      data: {
        data: req.query
      }
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  addBehavior(req, {
    module: 'file',
    msg: `下载模板文件 文件:${template}`,
    data: {
      template
    }
  })
  res.success({
    link: createDownloadUrl(k)
  })
})

/**
 * 下载单个文件
 */
router.get(
  'one',
  async (req, res) => {
    const { id } = req.query
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const [file] = await selectFiles({
      userId,
      id: +id
    })
    if (!file) {
      addBehavior(req, {
        module: 'file',
        msg: `下载文件失败 用户:${logAccount} 文件记录不存在`,
        data: {
          account: logAccount
        }
      })
      res.failWithError(publicError.file.notExist)
      return
    }
    // let k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    // 特殊要求去掉文件hash
    let k = `easypicker2/${file.task_key}/${file.name}`
    let isExist = false
    // 兼容旧路径的逻辑
    if (file.category_key) {
      isExist = await judgeFileIsExist(file.category_key)
    }

    if (!isExist) {
      isExist = await judgeFileIsExist(k)
    } else {
      k = file.category_key
    }

    if (!isExist) {
      addBehavior(req, {
        module: 'file',
        msg: `下载文件失败 用户:${logAccount} 文件:${file.name} 已从云上移除`,
        data: {
          account: logAccount,
          name: file.name
        }
      })
      res.failWithError(publicError.file.notExist)
      return
    }

    const status = await batchFileStatus([k])
    const mimeType = status[0]?.data?.mimeType
    addBehavior(req, {
      module: 'file',
      msg: `下载文件成功 用户:${logAccount} 文件:${file.name} 类型:${mimeType}`,
      data: {
        account: logAccount,
        name: file.name,
        mimeType,
        size: file.size
      }
    })
    const link = createDownloadUrl(k)
    await addDownloadAction({
      userId,
      type: ActionType.Download,
      thingId: file.id,
      data: {
        url: link,
        status: DownloadStatus.SUCCESS,
        ids: [file.id],
        tip: file.name,
        size: file.size
      }
    })
    res.success({
      link,
      mimeType
    })
  },
  {
    needLogin: true
  }
)

/**
 * 删除单个文件
 */
router.delete(
  'one',
  async (req, res) => {
    const { id } = req.body
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const [file] = await selectFiles({
      userId,
      id
    })
    if (!file) {
      addBehavior(req, {
        module: 'file',
        msg: `删除文件失败 用户:${logAccount} 文件记录不存在`,
        data: {
          account: logAccount,
          fileId: id
        }
      })
      res.failWithError(publicError.file.notExist)
      return
    }
    // let k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    // 特殊要求去掉文件hash
    let k = `easypicker2/${file.task_key}/${file.name}`
    // 兼容旧路径的逻辑
    if (file.category_key) {
      k = file.category_key
    }
    const sameRecord = await selectFiles({
      taskKey: file.task_key,
      hash: file.hash,
      name: file.name
    })
    const isRepeat = sameRecord.length > 1

    if (!isRepeat) {
      // 删除OSS上文件
      deleteObjByKey(k)
    }
    await deleteFileRecord(file)
    addBehavior(req, {
      module: 'file',
      msg: `删除文件提交记录成功 用户:${logAccount} 文件:${file.name} ${
        isRepeat ? `还存在${sameRecord.length - 1}个重复文件` : '删除OSS资源'
      }`,
      data: {
        account: logAccount,
        name: file.name,
        taskKey: file.task_key,
        hash: file.hash
      }
    })
    res.success()
  },
  {
    needLogin: true
  }
)

/**
 * 撤回提交的文件
 */
router.delete('withdraw', async (req, res) => {
  const { taskKey, taskName, filename, hash, peopleName, info } = req.body

  const limitPeople = (await selectTaskInfo({ taskKey }))?.[0]?.limit_people

  // 内容完全一致的提交记录，不包含限制的名字
  let files = await selectFiles({
    taskKey,
    taskName,
    name: filename,
    hash
  })
  files = files.filter((file) => isSameInfo(file.info, info))

  const passFiles = files.filter((file) => file.people === peopleName)

  if (!passFiles.length) {
    addBehavior(req, {
      module: 'file',
      msg: `撤回文件失败 ${peopleName} 文件:${filename} 信息不匹配`,
      data: {
        filename,
        peopleName,
        data: req.body
      }
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  const isDelOss = passFiles.length === files.length
  // 删除提交记录
  // 删除文件
  if (isDelOss) {
    // const key = `easypicker2/${taskKey}/${hash}/${filename}`
    // 特殊要求去掉文件hash
    const key = `easypicker2/${taskKey}/${filename}`
    deleteObjByKey(key)
  }
  await deleteFiles(passFiles)
  addBehavior(req, {
    module: 'file',
    msg: `撤回文件成功 文件:${filename} 删除记录:${
      passFiles.length
    } 删除OSS资源:${isDelOss ? '是' : '否'}`,
    data: {
      limitPeople,
      isDelOss,
      filesCount: files.length,
      passFilesCount: passFiles.length,
      filename,
      peopleName,
      data: req.body
    }
  })

  // 更新人员提交状态
  if (peopleName) {
    const [p] = await selectPeople(
      {
        name: peopleName,
        status: 1,
        taskKey
      },
      ['id']
    )
    if (!p) {
      addBehavior(req, {
        module: 'file',
        msg: `姓名:${peopleName} 不存在`,
        data: {
          filename,
          peopleName,
          data: req.body
        }
      })
      res.failWithError(publicError.file.notExist)
      return
    }
    await updatePeople(
      {
        status: (
          await selectFiles({ people: peopleName, taskKey }, ['people'])
        ).length
          ? 1
          : 0,
        // 更新最后操作时间
        submitDate: new Date()
      },
      {
        id: p.id
      }
    )
  }
  res.success()
})

/**
 * 批量下载
 */
router.post(
  'batch/down',
  async (req, res) => {
    const { ids, zipName } = req.body
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const files = await selectFiles({
      id: ids,
      userId
    })
    if (files.length === 0) {
      addBehavior(req, {
        module: 'file',
        msg: `批量下载文件失败 用户:${logAccount}`,
        data: {
          account: logAccount
        }
      })
      res.failWithError(publicError.file.notExist)
      return
    }
    let keys = []
    for (const file of files) {
      const { name, task_key, hash, category_key } = file
      // const key = `easypicker2/${task_key}/${hash}/${name}`
      // 特殊要求去掉文件hash
      const key = `easypicker2/${task_key}/${name}`
      if (!category_key) {
        keys.push(key)
      }
      // 兼容老板平台数据
      if (category_key) {
        const isOldExist = await judgeFileIsExist(category_key)
        if (isOldExist) {
          keys.push(category_key)
        } else {
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
      addBehavior(req, {
        module: 'file',
        msg: `批量下载文件失败 用户:${logAccount} 文件均已从云上移除`,
        data: {
          account: logAccount
        }
      })
      res.failWithError(publicError.file.notExist)
      return
    }
    addBehavior(req, {
      module: 'file',
      msg: `批量下载文件成功 用户:${logAccount} 文件数量:${keys.length}`,
      data: {
        account: logAccount,
        length: keys.length,
        size
      }
    })
    const filename = normalizeFileName(zipName) ?? `${getUniqueKey()}`
    const value = await makeZipWithKeys(keys, filename)
    addBehavior(req, {
      module: 'file',
      msg: `批量下载任务 用户:${logAccount} 文件数量:${keys.length} 压缩任务名${value}`,
      data: {
        account: logAccount,
        length: keys.length,
        size
      }
    })
    await addDownloadAction({
      userId,
      type: ActionType.Compress,
      data: {
        status: DownloadStatus.ARCHIVE,
        ids,
        tip: `${filename}.zip (${keys.length}个文件)`,
        archiveKey: value
      }
    })
    res.success({
      k: value
    })
  },
  {
    needLogin: true
  }
)

/**
 * 查询文件归档进度
 */
router.post(
  'compress/status',
  async (req, res) => {
    const { id } = req.body
    const data = await checkFopTaskStatus(id)
    if (data.code === 3) {
      res.fail(500, data.desc + data.error)
      addErrorLog(req, data.desc + data.error)
      return
    }
    res.success(data)
  },
  {
    needLogin: true
  }
)

/**
 * 批量删除
 */
router.delete(
  'batch/del',
  async (req, res) => {
    const { ids } = req.body
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const files = await selectFiles({
      id: ids,
      userId
    })
    if (files.length === 0) {
      res.success()
      return
    }
    const keys = new Set<string>()

    // TODO：上传时尽力保持每个文件的独立性
    // TODO：O(n²)的复杂度，观察一下实际操作频率优化，会导致接口时间变长
    for (const file of files) {
      const { name, task_key, hash, category_key } = file
      // 兼容旧逻辑
      if (category_key) {
        keys.add(category_key)
      } else {
        // 文件一模一样的记录避免误删
        const dbCount = (
          await selectFiles(
            {
              task_key,
              hash,
              name
            },
            ['id']
          )
        ).length
        const delCount = files.filter(
          (v) => v.task_key === task_key && v.hash === hash && v.name === name
        ).length
        if (dbCount <= delCount) {
          // keys.add(`easypicker2/${task_key}/${hash}/${name}`)
          // 特殊要求去掉文件hash
          keys.add(`easypicker2/${task_key}/${name}`)
        }
      }
    }

    // 删除OSS上文件
    batchDeleteFiles([...keys], req)
    await deleteFiles(files)
    res.success()
    addBehavior(req, {
      module: 'file',
      msg: `批量删除文件成功 用户:${logAccount} 文件记录数量:${files.length} OSS资源数量:${keys.size}`,
      data: {
        account: logAccount,
        length: files.length,
        ossCount: keys.size
      }
    })
  },
  {
    needLogin: true
  }
)

/**
 * 下载压缩文件
 */
router.post(
  'compress/down',
  async (req, res) => {
    const { account: logAccount } = await getUserInfo(req)
    const { key } = req.body
    if (
      typeof key === 'string' &&
      key.startsWith('easypicker2/temp_package/')
    ) {
      res.success({
        url: createDownloadUrl(key)
      })
      const filename = key.slice(key.lastIndexOf('/') + 1)
      addBehavior(req, {
        module: 'file',
        msg: `下载压缩文件成功 用户:${logAccount} 压缩文件名:${filename}`,
        data: {
          account: logAccount,
          filename
        }
      })
      return
    }

    addBehavior(req, {
      module: 'file',
      msg: `下载压缩文件失败 用户:${logAccount} 压缩文件名:${key} 不存在`,
      data: {
        account: logAccount,
        key
      }
    })
    res.failWithError(publicError.file.notExist)
  },
  {
    needLogin: true
  }
)

/**
 * 查询是否提交
 */
router.post('submit/people', async (req, res) => {
  const { taskKey, info, name = '' } = req.body

  let files = await selectFiles(
    {
      taskKey,
      people: name
    },
    ['id', 'info']
  )
  files = files.filter((v) => isSameInfo(v.info, JSON.stringify(info)))
  ;(async () => {
    const [task] = await selectTasks({
      k: taskKey
    })
    if (task) {
      addBehavior(req, {
        module: 'file',
        msg: `查询是否提交过文件: ${files.length > 0 ? '是' : '否'} 任务:${
          task.name
        } 数量:${files.length}`,
        data: {
          taskKey,
          taskName: task.name,
          info,
          count: files.length
        }
      })
    } else {
      addBehavior(req, {
        module: 'file',
        msg: `查询是否提交过文件: 任务 ${taskKey} 不存在`,
        data: {
          taskKey,
          taskName: task.name,
          info
        }
      })
    }
  })()

  res.success({
    isSubmit: files.length > 0,
    txt: ''
  })
})
export default router
