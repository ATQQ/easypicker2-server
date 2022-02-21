import { Router } from 'flash-wolves'
import { CategoryError } from '@/constants/errorMsg'
import { deleteCategory, insertCategory, selectCategory } from '@/db/categoryDb'
import { addBehavior } from '@/db/logDb'
import { updateTask } from '@/db/taskDb'

import { getUserInfo } from '@/utils/userUtil'

const router = new Router('category')

/**
 * 新建分类
 */
router.post('create', async (req, res) => {
  const { name } = req.body
  const { id: user_id, account: logAccount } = await getUserInfo(req)
  const categories = await selectCategory({
    user_id,
    name,
  })
  // 分类已存在
  if (categories.length !== 0) {
    addBehavior(req, {
      module: 'category',
      msg: `创建分类失败(已存在) 用户:${logAccount} 名称:${name}`,
      data: {
        name,
        account: logAccount,
      },
    })
    res.failWithError(CategoryError.exist)
    return
  }
  addBehavior(req, {
    module: 'category',
    msg: `创建分类成功 用户:${logAccount} 名称:${name}`,
    data: {
      name,
      account: logAccount,
    },
  })
  await insertCategory({
    user_id,
    name,
  })
  res.success()
}, {
  needLogin: true,
})

/**
 * 获取分类列表
 */
router.get('', async (req, res) => {
  const { id: user_id, account: logAccount } = await getUserInfo(req)
  addBehavior(req, {
    module: 'category',
    msg: `获取分类列表 用户:${logAccount}`,
    data: {
      account: logAccount,
    },
  })
  const categories = await selectCategory({
    user_id,
  })
  categories.forEach((v) => {
    v.user_id = undefined
  })
  res.success({
    categories,
  })
}, {
  needLogin: true,
})

/**
 * 删除指定分类
 */
router.delete('/:key', async (req, res) => {
  const { key } = req.params
  const { id: user_id, account: logAccount } = await getUserInfo(req)
  const [c] = await selectCategory({
    k: key,
    user_id,
  })
  if (c) {
    await deleteCategory({
      id: c.id,
    })
    // 删掉的分类下的所有任务变为默认分类
    await updateTask({
      categoryKey: 'default',
    }, {
      categoryKey: key,
    })

    // 记录日志
    addBehavior(req, {
      module: 'category',
      msg: `删除指定分类 用户:${logAccount} 名称:${c.name}`,
      data: {
        account: logAccount,
        name: c.name,
      },
    })
  }
  res.success()
}, {
  needLogin: true,
})
export default router
