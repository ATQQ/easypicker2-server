import { CategoryError } from '@/constants/errorMsg'
import { deleteCategory, insertCategory, selectCategory } from '@/db/categoryDb'
import { updateTask } from '@/db/taskDb'
import Router from '@/lib/Router'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('category')

router.post('create', async (req, res) => {
  const { name } = req.body
  const { id: user_id } = await getUserInfo(req)
  const categories = await selectCategory({
    user_id,
    name,
  })
  // 分类已存在
  if (categories.length !== 0) {
    res.failWithError(CategoryError.exist)
    return
  }
  insertCategory({
    user_id,
    name,
  }).then(() => {
    res.success()
  })
}, {
  needLogin: true,
})

router.get('', async (req, res) => {
  const { id: user_id } = await getUserInfo(req)
  selectCategory({
    user_id,
  }).then((categories) => {
    categories.forEach((v) => {
      v.user_id = undefined
    })
    res.success({
      categories,
    })
  })
}, {
  needLogin: true,
})

router.delete('/:key', async (req, res) => {
  const { key } = req.params
  const { id: user_id } = await getUserInfo(req)
  deleteCategory({
    k: key,
    user_id,
  }).then(() => {
    // 删掉的分类下的所有任务变为默认分类
    updateTask({
      categoryKey: 'default',
    }, {
      categoryKey: key,
    })
    res.success()
  })
}, {
  needLogin: true,
})
export default router
