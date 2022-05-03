import {
  FWRequest,
  Get, Put, ReqBody, Response, RouterController,
} from 'flash-wolves'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import { selectAllUser, selectUserById, updateUser } from '@/db/userDb'
import { addBehavior } from '@/db/logDb'
import { rPassword } from '@/utils/regExp'
import { encryption } from '@/utils/stringUtil'

const power = {
  userPower: USER_POWER.SUPER,
  needLogin: true,
}

@RouterController('super/user')
export default class SuperUserController {
  /**
   * 获取用户劣列表
   */
  @Get('list', power)
  async getUserList() {
    const columns = ['id', 'account', 'phone', 'status', 'join_time', 'login_time', 'login_count', 'open_time']
    const users = await selectAllUser(columns)
    return {
      list: users.map((u) => ({
        ...u,
        phone: u?.phone?.slice(-4),
      })),
    }
  }

  /**
   * 修改账号状态
   */
  @Put('status', power)
  async changeStatus(@ReqBody('id') id: number, @ReqBody('status') status: USER_STATUS, @ReqBody('openTime') openTime: any) {
    if (status !== USER_STATUS.FREEZE) {
      openTime = null
    } else {
      openTime = new Date(new Date(openTime).getTime())
    }
    await updateUser({
      status,
      openTime,
    }, {
      id,
    })
  }

  @Put('password', power)
  async resetPassword(@ReqBody('id') id: number, @ReqBody('password') password: string, req:FWRequest) {
    const user = await selectUserById(id)
    if (!user.length || !rPassword.test(password)) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '重置用户密码: 参数不合法',
      })
      return Response.fail(500, '参数不合法')
    }
    delete req.body.password
    addBehavior(req, {
      module: 'super',
      data: req.body,
      msg: `重置用户密码: ${user[0].account}`,
    })
    await updateUser({
      password: encryption(password),
    }, {
      id,
    })
  }
}
