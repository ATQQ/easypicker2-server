import { Router } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import {
  deleteFileRecord,
  deleteFiles,
  insertFile,
  selectFiles,
} from '@/db/fileDb'
import { addBehavior, addErrorLog } from '@/db/logDb'
import type { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'

import {
  batchDeleteFiles,
  checkFopTaskStatus,
  createDownloadUrl,
  deleteObjByKey,
  getUploadToken,
  judgeFileIsExist,
} from '@/utils/qiniuUtil'
import { isSameInfo, normalizeFileName } from '@/utils/stringUtil'
import { getQiniuFileUrlExpiredTime, getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'

const router = new Router('file')

// TODO: 优化上传逻辑

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
    hash,
  })
  files = files.filter(file => isSameInfo(file.info, info))

  const passFiles = files.filter(file => file.people === peopleName)

  if (!passFiles.length) {
    addBehavior(req, {
      module: 'file',
      msg: `撤回文件失败 ${peopleName} 文件:${filename} 信息不匹配`,
      data: {
        filename,
        peopleName,
        data: req.body,
      },
    })
    res.failWithError(publicError.file.notExist)
    return
  }
  const isDelOss = passFiles.length === files.length
  // 删除提交记录
  // 删除文件
  if (isDelOss) {
    const key = `easypicker2/${taskKey}/${hash}/${filename}`
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
      data: req.body,
    },
  })

  // 更新人员提交状态
  if (peopleName) {
    const [p] = await selectPeople(
      {
        name: peopleName,
        status: 1,
        taskKey,
      },
      ['id'],
    )
    if (!p) {
      addBehavior(req, {
        module: 'file',
        msg: `姓名:${peopleName} 不存在`,
        data: {
          filename,
          peopleName,
          data: req.body,
        },
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
        submitDate: new Date(),
      },
      {
        id: p.id,
      },
    )
  }
  res.success()
})

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
    needLogin: true,
  },
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
      userId,
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
      }
      else {
        // 文件一模一样的记录避免误删
        const dbCount = (
          await selectFiles(
            {
              task_key,
              hash,
              name,
            },
            ['id'],
          )
        ).length
        const delCount = files.filter(
          v => v.task_key === task_key && v.hash === hash && v.name === name,
        ).length
        if (dbCount <= delCount) {
          keys.add(`easypicker2/${task_key}/${hash}/${name}`)
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
        ossCount: keys.size,
      },
    })
  },
  {
    needLogin: true,
  },
)

// /**
//  * 下载压缩文件，下线
//  */
// router.post(
//   'compress/down',
//   async (req, res) => {
//     const { account: logAccount } = await getUserInfo(req)
//     const { key } = req.body
//     if (
//       typeof key === 'string'
//       && key.startsWith('easypicker2/temp_package/')
//     ) {
//       res.success({
//         url: createDownloadUrl(key),
//       })
//       const filename = key.slice(key.lastIndexOf('/') + 1)
//       addBehavior(req, {
//         module: 'file',
//         msg: `下载压缩文件成功 用户:${logAccount} 压缩文件名:${filename}`,
//         data: {
//           account: logAccount,
//           filename,
//         },
//       })
//       return
//     }

//     addBehavior(req, {
//       module: 'file',
//       msg: `下载压缩文件失败 用户:${logAccount} 压缩文件名:${key} 不存在`,
//       data: {
//         account: logAccount,
//         key,
//       },
//     })
//     res.failWithError(publicError.file.notExist)
//   },
//   {
//     needLogin: true,
//   },
// )

/**
 * 查询是否提交
 */
router.post('submit/people', async (req, res) => {
  const { taskKey, info, name = '' } = req.body

  let files = await selectFiles(
    {
      taskKey,
      people: name,
    },
    ['id', 'info'],
  )
  files = files.filter(v => isSameInfo(v.info, JSON.stringify(info)))
  ;(async () => {
    const [task] = await selectTasks({
      k: taskKey,
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
          count: files.length,
        },
      })
    }
    else {
      addBehavior(req, {
        module: 'file',
        msg: `查询是否提交过文件: 任务 ${taskKey} 不存在`,
        data: {
          taskKey,
          taskName: task.name,
          info,
        },
      })
    }
  })()

  res.success({
    isSubmit: files.length > 0,
    txt: '',
  })
})
export default router
