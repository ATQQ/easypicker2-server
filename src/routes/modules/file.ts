import { Router } from 'flash-wolves'
import filenamify from 'filenamify'
import { publicError } from '@/constants/errorMsg'
import {
  deleteFileRecord, deleteFiles, insertFile, selectFiles,
} from '@/db/fileDb'
import { addBehavior, addErrorLog, getClientIp } from '@/db/logDb'
import { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'

import {
  batchDeleteFiles, batchFileStatus, checkFopTaskStatus, createDownloadUrl,
  deleteObjByKey, getUploadToken, judgeFileIsExist, makeZipWithKeys,
} from '@/utils/qiniuUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('file')

/**
 * 获取上传令牌
 */
router.get('token', (req, res) => {
  const token = getUploadToken()
  const logIp = getClientIp(req)
  addBehavior(req, {
    module: 'file',
    msg: `获取文件上传令牌 ip:${logIp}`,
    data: {
      ip: logIp,
    },
  })
  res.success({
    token,
  })
})

/**
 * 记录提交的文件信息
 */
router.post('info', async (req, res) => {
  const logIp = getClientIp(req)

  const data: File = req.body
  const [task] = await selectTasks({
    k: data.taskKey,
  })
  if (!task) {
    addBehavior(req, {
      module: 'file',
      msg: `提交文件 ip:${logIp} 参数错误`,
      data: {
        ip: logIp,
        data,
      },
    })
    res.failWithError(publicError.request.errorParams)
    return
  }
  const { user_id } = task
  Object.assign<File, File>(data, { user_id, date: new Date(), categoryKey: '' })
  data.name = filenamify(data.name, { replacement: '_' })
  await insertFile(data)
  addBehavior(req, {
    module: 'file',
    msg: `提交文件 ip:${logIp} 文件名:${data.name} 成功`,
    data: {
      ip: logIp,
      data,
    },
  })
  res.success()
})

/**
 * 获取文件列表
 */
router.get('list', async (req, res) => {
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const files = await selectFiles({
    userId,
  })
  // 逆序
  addBehavior(req, {
    module: 'file',
    msg: `获取文件列表 用户:${logAccount} 成功`,
    data: {
      logAccount,
    },
  })
  res.success({
    files,
  })
}, {
  needLogin: true,
})

/**
 * 获取模板文件下载链接
 */
router.get('template', async (req, res) => {
  const logIp = getClientIp(req)

  const { template, key } = req.query
  const k = `easypicker2/${key}_template/${template}`
  const isExist = await judgeFileIsExist(k)
  if (!isExist) {
    addBehavior(req, {
      module: 'file',
      msg: `下载模板文件 ip:${logIp} 参数错误`,
      data: {
        ip: logIp,
        data: req.query,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  addBehavior(req, {
    module: 'file',
    msg: `下载模板文件 ip:${logIp} 文件:${template}`,
    data: {
      ip: logIp,
      template,
    },
  })
  res.success({
    link: createDownloadUrl(k),
  })
})

/**
 * 下载单个文件
 */
router.get('one', async (req, res) => {
  const { id } = req.query
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const [file] = await selectFiles({
    userId,
    id: +id,
  })
  if (!file) {
    addBehavior(req, {
      module: 'file',
      msg: `下载文件失败 用户:${logAccount} 文件记录不存在`,
      data: {
        account: logAccount,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  let k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
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
        name: file.name,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }

  addBehavior(req, {
    module: 'file',
    msg: `下载文件成功 用户:${logAccount} 文件:${file.name}`,
    data: {
      account: logAccount,
      name: file.name,
    },
  })
  res.success({
    link: createDownloadUrl(k),
  })
}, {
  needLogin: true,
})

/**
 * 删除某个文件
 */
router.delete('one', async (req, res) => {
  const { id } = req.body
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const [file] = await selectFiles({
    userId,
    id,
  })
  if (!file) {
    addBehavior(req, {
      module: 'file',
      msg: `删除文件失败 用户:${logAccount} 文件记录不存在`,
      data: {
        account: logAccount,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  let k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
  if (file.category_key) {
    k = file.category_key
  }
  // 删除云上文件
  deleteObjByKey(k)
  await deleteFileRecord(file)
  addBehavior(req, {
    module: 'file',
    msg: `删除文件成功 用户:${logAccount} 文件:${file.name}`,
    data: {
      account: logAccount,
      name: file.name,
    },
  })
  res.success()
}, {
  needLogin: true,
})

/**
 * 撤回提交的文件
 */
router.delete('withdraw', async (req, res) => {
  const logIp = getClientIp(req)
  const {
    taskKey, taskName, filename, hash, peopleName, info,
  } = req.body
  const [file] = await selectFiles({
    taskKey,
    taskName,
    name: filename,
    hash,
    info,
  })
  if (!file || (file.people && file.people !== peopleName)) {
    addBehavior(req, {
      module: 'file',
      msg: `撤回文件失败 ip:${logIp} ${peopleName} 文件:${filename} 信息不匹配`,
      data: {
        ip: logIp,
        filename,
        peopleName,
        data: req.body,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }

  // 删除提交记录
  // 删除文件
  const key = `easypicker2/${taskKey}/${hash}/${filename}`
  deleteObjByKey(key)
  await deleteFileRecord(file)
  addBehavior(req, {
    module: 'file',
    msg: `撤回文件成功 ip:${logIp} ${peopleName} 文件:${filename}`,
    data: {
      ip: logIp,
      filename,
      peopleName,
      data: req.body,
    },
  })

  // 更新人员提交状态
  if (peopleName) {
    const [p] = await selectPeople({
      name: peopleName,
      status: 1,
      taskKey,
    }, ['id'])
    if (!p) {
      addBehavior(req, {
        module: 'file',
        msg: `撤回文件失败 ip:${logIp} 文件:${filename} 姓名:${peopleName} 信息不匹配`,
        data: {
          ip: logIp,
          filename,
          peopleName,
          data: req.body,
        },
      })
      res.failWithError(publicError.file.notExist)
      return
    }
    await updatePeople({
      status: (await selectFiles({ people: peopleName, taskKey }, ['people'])).length ? 1 : 0,
      // 更新最后操作时间
      submitDate: new Date(),
    }, {
      id: p.id,
    })
  }
  res.success()
})

/**
 * 批量下载
 */
router.post('batch/down', async (req, res) => {
  const { ids, zipName } = req.body
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const files = await selectFiles({
    id: ids,
    userId,
  })
  if (files.length === 0) {
    addBehavior(req, {
      module: 'file',
      msg: `批量下载文件失败 用户:${logAccount}`,
      data: {
        account: logAccount,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  let keys = []
  for (const file of files) {
    const {
      name, task_key, hash, category_key,
    } = file
    const key = `easypicker2/${task_key}/${hash}/${name}`
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
  keys = keys.filter((_, idx) => {
    const { code } = filesStatus[idx]
    return code === 200
  })
  if (keys.length === 0) {
    addBehavior(req, {
      module: 'file',
      msg: `批量下载文件失败 用户:${logAccount} 文件均已从云上移除`,
      data: {
        account: logAccount,
      },
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
    },
  })
  const value = await makeZipWithKeys(keys, filenamify(zipName, { replacement: '_' }) ?? `${getUniqueKey()}`)
  addBehavior(req, {
    module: 'file',
    msg: `批量下载任务 用户:${logAccount} 文件数量:${keys.length} 压缩任务名${value}`,
    data: {
      account: logAccount,
      length: keys.length,
    },
  })
  res.success({
    k: value,
  })
}, {
  needLogin: true,
})

/**
 * 查询文件归档进度
 */
router.post('compress/status', async (req, res) => {
  const { id } = req.body
  const data = await checkFopTaskStatus(id)
  if (data.code === 3) {
    res.fail(500, data.desc + data.error)
    addErrorLog(req, data.desc + data.error)
    return
  }
  res.success(data)
}, {
  needLogin: true,
})

/**
 * 批量删除
 */
router.delete('batch/del', async (req, res) => {
  const { ids } = req.body
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const files = await selectFiles({
    id: ids,
    userId,
  })
  if (files.length === 0) {
    res.success()
    return
  }
  const keys = files.map((v) => {
    const {
      name, task_key, hash, category_key,
    } = v
    if (category_key) {
      return category_key
    }
    return `easypicker2/${task_key}/${hash}/${name}`
  })

  // 删除云上记录
  batchDeleteFiles(keys)
  await deleteFiles(files)
  res.success()
  addBehavior(req, {
    module: 'file',
    msg: `批量删除文件成功 用户:${logAccount} 文件数量:${files.length}`,
    data: {
      account: logAccount,
      length: files.length,
    },
  })
  // 删除记录
  // deleteFileRecord({
  //     id: ids,
  //     userId
  // }).then(() => {
  //     res.success()
  // })
}, {
  needLogin: true,
})

/**
 * 下载压缩文件
 */
router.post('compress/down', async (req, res) => {
  const { account: logAccount } = await getUserInfo(req)
  const { key } = req.body
  if (typeof key === 'string' && key.startsWith('easypicker2/temp_package/')) {
    res.success({
      url: createDownloadUrl(key),
    })
    const filename = key.slice(key.lastIndexOf('/') + 1)
    addBehavior(req, {
      module: 'file',
      msg: `下载压缩文件成功 用户:${logAccount} 压缩文件名:${filename}`,
      data: {
        account: logAccount,
        filename,
      },
    })
    return
  }

  addBehavior(req, {
    module: 'file',
    msg: `下载压缩文件失败 用户:${logAccount} 压缩文件名:${key} 不存在`,
    data: {
      account: logAccount,
      key,
    },
  })
  res.failWithError(publicError.file.notExist)
}, {
  needLogin: true,
})

/**
 * 查询是否提交
 */
router.post('submit/people', async (req, res) => {
  const { taskKey, info } = req.body
  const files = await selectFiles({
    taskKey,
    info: JSON.stringify(info),
  });
  (async () => {
    const [task] = await selectTasks({
      k: taskKey,
    })
    if (task) {
      addBehavior(req, {
        module: 'file',
        msg: `查询是否提交过文件: 任务:${task.name} 信息:${info.map((v) => v.value).join('-')}`,
        data: {
          taskKey,
          taskName: task.name,
          info,
        },
      })
    }
    addBehavior(req, {
      module: 'file',
      msg: '',
      data: {
        taskKey,
      },
    })
  })()

  res.success({
    isSubmit: files.length > 0,
    txt: '',
  })
})
export default router
