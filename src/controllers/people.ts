import {
  RouterController,
  Post,
  ReqBody,
  ReqParams,
  FWRequest,
  Get,
  Put,
} from 'flash-wolves'
import { selectTasks } from '@/db/taskDb'
import { deletePeople, insertPeople, selectPeople } from '@/db/peopleDb'
import { addBehavior, addErrorLog } from '@/db/logDb'
import { getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'

const power = {
  needLogin: true,
}

@RouterController('people')
export default class PeopleController {
  /**
   * 检查是否有提交权限
   */
  @Post('/check/:key')
  async checkPeopleIsExist(
    @ReqBody('name') name:string,
    @ReqParams('key') key:string,
      req:FWRequest,
  ) {
    const [task] = await selectTasks({
      k: key,
    })
    if (!task) {
      return {
        exist: false,
      }
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
    return {
      exist,
    }
  }

  @Get('/template/:key', power)
  async getUsefulTemplate(@ReqParams('key') taskKey:string, req:FWRequest) {
    // userInfo可以通过装饰器注入
    const user = await getUserInfo(req)
    const taskKeyList = (await selectTaskInfo({
      userId: user.id,
      limitPeople: 1,
    }, ['task_key'])).filter((v) => v.task_key !== taskKey).map((v) => v.task_key)

    const taskInfo = (await selectTasks({
      k: taskKeyList,
    }, ['k', 'name']))

    // 查询每任务中的的成员名单信息
    const people = await selectPeople({ taskKey: taskInfo.map((v) => v.k) }, ['task_key', 'name'])

    const data = taskInfo.map((v) => {
      const count = people.filter((p) => p.task_key === v.k).length
      return {
        taskKey: v.k,
        name: v.name,
        count,
      }
    })
    return data
  }

  @Put('/template/:key', power)
  async importPeopleFromTpl(@ReqParams('key') taskKey:string, @ReqBody('key') tplKey, @ReqBody('type') type:'override'|'add', req:FWRequest) {
    const fail:string[] = []
    const success:string[] = []
    // 非法操作
    if (taskKey === tplKey) {
      addErrorLog(req, '非法导入人员模板', new Error('非法导入人员模板').stack)
      return {
        success: success.length,
        fail,
      }
    }

    const user = await getUserInfo(req)

    // 先取模板需要的
    const people = await selectPeople({ userId: user.id, taskKey: tplKey }, ['name'])
    // 如果是覆盖
    if (type === 'override') {
      // 先删除当前任务中的
      await deletePeople({
        userId: user.id,
        taskKey,
      })
      success.push(...people.map((v) => v.name))
    }
    if (type === 'add') {
      // 取当前任务
      const nowPeople = (await selectPeople({ userId: user.id, taskKey }, ['name'])).map((v) => v.name)
      for (const p of people) {
        if (nowPeople.includes(p.name)) {
          fail.push(p.name)
        } else {
          success.push(p.name)
        }
      }
    }
    if (success.length) {
      await insertPeople(success.map((name) => ({ name })), { taskKey, userId: user.id })
    }
    addBehavior(req, {
      module: 'people',
      msg: `模板导入人员名单 用户:${user.account} 成功:${success.length} 失败:${fail.length}`,
      data: {
        account: user.account,
        success: success.length,
        fail: fail.length,
      },
    })

    return {
      success: success.length,
      fail,
    }
  }
}
