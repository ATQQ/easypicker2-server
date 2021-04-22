import { publicError } from '@/constants/errorMsg'
import {
  deleteFileRecord, deleteFiles, insertFile, selectFiles,
} from '@/db/fileDb'
import { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'
import Router from '@/lib/Router'
import {
  batchDeleteFiles, batchFileStatus, checkFopTaskStatus, createDownloadUrl, deleteObjByKey, getUploadToken, judgeFileIsExist, makeZipWithKeys,
} from '@/utils/qiniuUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('file')

/**
 * 获取上传令牌
 */
router.get('token', (req, res) => {
  const token = getUploadToken()
  res.success({
    token,
  })
})

/**
 * 记录提交的文件信息
 */
router.post('info', async (req, res) => {
  const data: File = req.body
  const [task] = await selectTasks({
    k: data.taskKey,
  })
  if (!task) {
    res.failWithError(publicError.request.errorParams)
    return
  }
  const { user_id } = task
  Object.assign<File, File>(data, { user_id, date: new Date() })
  await insertFile(data)
  res.success()
})

/**
 * 获取文件列表
 */
router.get('list', async (req, res) => {
  const { id: userId } = await getUserInfo(req)
  selectFiles({
    userId,
  }).then((files) => {
    res.success({
      files,
    })
  }).catch((err) => {
    res.fail(500, err)
  })
}, {
  needLogin: true,
})

/**
 * 获取模板文件下载链接
 */
router.get('template', async (req, res) => {
  const { template, key } = req.query
  const k = `easypicker2/${key}_template/${template}`
  const isExist = await judgeFileIsExist(k)
  if (!isExist) {
    res.failWithError(publicError.file.notExist)
    return
  }
  res.success({
    link: createDownloadUrl(k),
  })
})

/**
 * 下载单个文件
 */
router.get('one', async (req, res) => {
  const { id } = req.query
  const { id: userId } = await getUserInfo(req)
  const [file] = await selectFiles({
    userId,
    id: +id,
  })
  if (!file) {
    res.failWithError(publicError.file.notExist)
    return
  }
  let k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
  if (file.category_key) {
    k = file.category_key
  }
  const isExist = await judgeFileIsExist(k)
  if (!isExist) {
    res.failWithError(publicError.file.notExist)
    return
  }
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
  const { id: userId } = await getUserInfo(req)
  const [file] = await selectFiles({
    userId,
    id,
  })
  if (!file) {
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
  res.success()
}, {
  needLogin: true,
})

/**
 * 撤回提交的文件
 */
router.delete('withdraw', async (req, res) => {
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
    res.failWithError(publicError.file.notExist)
    return
  }

  // 更新人员提交状态
  if (peopleName) {
    const [p] = await selectPeople({
      name: peopleName,
      status: 1,
      taskKey,
    }, ['id'])
    if (!p) {
      res.failWithError(publicError.file.notExist)
      return
    }
    await updatePeople({
      status: 0,
    }, {
      id: p.id,
    })
  }
  // 删除提交记录
  // 删除文件
  const key = `easypicker2/${taskKey}/${hash}/${filename}`
  deleteObjByKey(key)
  await deleteFileRecord(file)
  res.success()
})

/**
 * 批量下载
 */
router.post('batch/down', async (req, res) => {
  const { ids } = req.body
  const { id: userId } = await getUserInfo(req)
  const files = await selectFiles({
    id: ids,
    userId,
  })
  if (files.length === 0) {
    res.failWithError(publicError.file.notExist)
    return
  }
  let keys = files.map((v) => {
    const {
      name, task_key, hash, category_key,
    } = v
    // 兼容老板平台数据
    if (category_key) {
      return category_key
    }
    return `easypicker2/${task_key}/${hash}/${name}`
  })
  const filesStatus = await batchFileStatus(keys)

  keys = keys.filter((v, idx) => {
    const { code } = filesStatus[idx]
    return code === 200
  })
  if (keys.length === 0) {
    res.failWithError(publicError.file.notExist)
    return
  }
  makeZipWithKeys(keys, `${getUniqueKey()}`).then((v) => {
    res.success({
      k: v,
    })
  })
}, {
  needLogin: true,
})

/**
 * 查询文件归档进度
 */
router.post('compress/status', (req, res) => {
  const { id } = req.body
  checkFopTaskStatus(id).then((data) => {
    res.success(data)
  })
}, {
  needLogin: true,
})

/**
 * 批量删除
 */
router.delete('batch/del', async (req, res) => {
  const { ids } = req.body
  const { id: userId } = await getUserInfo(req)
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

router.post('compress/down', (req, res) => {
  const { key } = req.body
  if (typeof key === 'string' && key.startsWith('easypicker2/temp_package/')) {
    res.success({
      url: createDownloadUrl(key),
    })
    return
  }

  res.failWithError(publicError.file.notExist)
}, {
  needLogin: true,
})
export default router
