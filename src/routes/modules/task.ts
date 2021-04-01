import { Task } from '@/db/model/task'
import { deleteTask, insertTask, selectTasks, updateTask } from '@/db/taskDb'
import Router from '@/lib/Router'
import { getUserInfo } from '@/utils/userUtil'
const router = new Router('task')

router.post('create', async (req, res) => {
    // TODO: 创建附加属性
    const { name, category } = req.body
    const { id } = await getUserInfo(req)
    const options: Task = {
        name,
        categoryKey: category || '',
        userId: id
    }
    await insertTask(options)
    res.success()
})

router.get('', async (req, res) => {
    const { id } = await getUserInfo(req)
    selectTasks({
        userId: id
    }).then(data => {
        const tasks = data.map(t => {
            const { name, category_key: category, k: key } = t
            return {
                name,
                category,
                key
            }
        })
        res.success({
            tasks
        })
    })
})

router.get('/:key', async (req, res) => {
    const { key } = req.params
    const [task] = await selectTasks({
        k: key
    })
    res.success({
        name: task.name,
        category: task.category_key
    })
})

router.delete('/:key', async (req, res) => {
    const { id } = await getUserInfo(req)
    const { key } = req.params
    await deleteTask({
        userId: id,
        k: key
    })
    // TODO:任务删除了,异步删除任务下的所有已经提交的文件
    res.success()
})

router.put('/:key', async (req, res) => {
    const { name, category } = req.body
    const { id } = await getUserInfo(req)
    const { key } = req.params
    const query: Task = { userId: id, k: key }
    const task: Task = {}
    if (name) {
        task.name = name
    }
    if (category !== undefined) {
        task.categoryKey = category
    }
    await updateTask(task, query)
    res.success()
})
export default router