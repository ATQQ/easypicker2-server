/* eslint-disable no-case-declarations */
import { publicError } from '@/constants/errorMsg'
import Router from '@/lib/Router'
import { getUserInfo } from '@/utils/userUtil'
import path from 'path'
import fs from 'fs'
import { People } from '@/db/model/people'
import {
  deletePeople, insertPeople, selectPeople, updatePeople,
} from '@/db/peopleDb'
import { selectFiles } from '@/db/fileDb'
import { addBehavior, getClientIp } from '@/db/logDb'
import { selectTasks } from '@/db/taskDb'

const router = new Router('people')
const fileDir = path.resolve(__dirname, '../../upload')

// TODO: excel格式支持
const supportType = ['text/plain']

/**
 * 上传人员名单
 */
router.post('/:key', async (req, res) => {
  const { filename, type } = req.body
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const { key } = req.params
  const filepath = path.join(fileDir, filename)

  if (!supportType.includes(type)) {
    res.failWithError(publicError.file.notSupport)
    return
  }
  switch (type) {
    case 'text/plain':
      const fileContent = fs.readFileSync(filepath, { encoding: 'utf-8' })
      fs.rmSync(filepath)
      const defaultData: People = { taskKey: key, userId }
      // 文件中的名单
      const peopleData: string[] = fileContent.split('\n')
      // 已经存在的名单
      const alreadyPeople = (await selectPeople(defaultData)).map((v) => v.name)

      const fail: string[] = []
      const success: string[] = []

      peopleData.forEach((p) => {
        if (alreadyPeople.includes(p)) {
          fail.push(p)
        } else if (!!p && !success.includes(p)) {
          success.push(p)
        }
      })
      if (success.length > 0) {
        await insertPeople(success.map((name) => ({ name })), defaultData)
      }

      addBehavior(req, {
        module: 'people',
        msg: `导入人员名单 用户:${logAccount} 成功:${success.length} 失败:${fail.length}`,
        data: {
          account: logAccount,
          success: success.length,
          fail: fail.length,
        },
      })
      res.success({
        success: success.length,
        fail,
      })
      return
    default:
      break
  }
  res.success()
}, {
  needLogin: true,
})

/**
 * 获取人员列表
 */
router.get('/:key', async (req, res) => {
  const { id: userId, account: logAccount } = await getUserInfo(req)
  const { key } = req.params
  const people = (await selectPeople({
    userId,
    taskKey: key,
  }, [])).map((v) => ({
    id: v.id,
    name: v.name,
    status: v.status,
    lastDate: v.submit_date,
    count: v.submit_count,
  }))
  addBehavior(req, {
    module: 'people',
    msg: `获取人员名单 用户:${logAccount}`,
    data: {
      account: logAccount,
    },
  })
  res.success({
    people,
  })
}, {
  needLogin: true,
})

/**
 * 查看人员是否在提交名单中
 */
router.get('/check/:key', async (req, res) => {
  const { key } = req.params
  const { name } = req.query
  const [task] = await selectTasks({
    k: key,
  })
  if (!task) {
    res.success({
      exist: false,
    })
    return
  }
  const people = await selectPeople({
    taskKey: key,
    name,
  })
  const exist = people.length !== 0
  addBehavior(req, {
    module: 'people',
    msg: `查询是否拥有提交权限 任务:${task.name} 成员姓名:${name} 权限:${exist ? '有' : '无'}`,
    data: {
      taskName: task.name,
      name,
      exist,
    },
  })
  res.success({
    exist,
  })
})

/**
 * 删除指定人员
 */
router.delete('/:key', async (req, res) => {
  const { key } = req.params
  const { id } = req.body
  const { id: userId, account: logAccount } = await getUserInfo(req)
  if (key && id && userId) {
    const [p] = await selectPeople({
      id,
    })
    if (p) {
      deletePeople({
        id,
        userId,
        taskKey: key,
      });

      // 记录日志
      (async () => {
        const [task] = await selectTasks({
          k: key,
        })
        if (task) {
          addBehavior(req, {
            module: 'people',
            msg: `删除任务人员 用户:${logAccount} 任务:${task.name} 成员:${p.name}`,
            data: {
              account: logAccount,
              taskName: task.name,
              name: p.name,
            },
          })
        }
      })()
    }
  }

  res.success()
}, {
  needLogin: true,
})

/**
 * 更新人员提交信息
 */
router.put('/:key', async (req, res) => {
  const logIp = getClientIp(req)

  const { key } = req.params
  const { name, filename, hash } = req.body
  if (!name || !filename || !key || !hash) {
    addBehavior(req, {
      module: 'people',
      msg: `更新提交人员信息 ip:${logIp} 参数错误`,
      data: {
        ip: logIp,
        key,
        name,
        filename,
        hash,
      },
    })
    res.failWithError(publicError.request.errorParams)
    return
  }
  const files = await selectFiles({
    taskKey: key,
    name: filename,
    hash,
  })
  if (files.length === 0) {
    addBehavior(req, {
      module: 'people',
      msg: `更新提交人员信息 ip:${logIp} 参数错误`,
      data: {
        ip: logIp,
        key,
        name,
        filename,
        hash,
      },
    })
    res.failWithError(publicError.request.errorParams)
    return
  }
  await updatePeople({
    status: 1,
    submitDate: new Date(),
  }, {
    name,
    taskKey: key,
  })
  selectTasks({
    k: key,
  }).then(([task]) => {
    if (task) {
      addBehavior(req, {
        module: 'people',
        msg: `更新提交人员信息 ip:${logIp} 成功 任务:${task.name} 姓名:${name}`,
        data: {
          ip: logIp,
          key,
          taskName: task.name,
          name,
          filename,
          hash,
        },
      })
    }
  })

  res.success()
})
export default router
