import {
  FWRequest,
  Get,
  Put,
  ReqBody,
  Response,
  RouterController
} from 'flash-wolves'
import SuperService from '@/service/super'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import {
  selectAllUser,
  selectUserByAccount,
  selectUserById,
  selectUserByPhone,
  updateUser
} from '@/db/userDb'
import { addBehavior } from '@/db/logDb'
import { rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'
import { encryption } from '@/utils/stringUtil'
import { expiredRedisKey, getRedisVal } from '@/db/redisDb'
import { selectFiles } from '@/db/fileDb'
import { UserError } from '@/constants/errorMsg'

const power = {
  userPower: USER_POWER.SUPER,
  needLogin: true
}

@RouterController('super/user')
export default class SuperUserController {
  /**
   * 获取用户劣列表
   */
  @Get('list', power)
  async getUserList() {
    const columns = [
      'id',
      'account',
      'phone',
      'status',
      'join_time',
      'login_time',
      'login_count',
      'open_time'
    ]
    // 用户数据
    const users = await selectAllUser(columns)
    // 获取文件数据
    const files = await selectFiles({}, ['task_key', 'user_id', 'hash', 'name'])
    // 云文件数据
    const ossFiles = await SuperService.getOssFiles()
    console.log(ossFiles[0])
    return {
      list: users.map((u) => ({
        ...u,
        phone: u?.phone?.slice(-4)
      }))
    }
  }

  /**
   * 修改账号状态
   */
  @Put('status', power)
  async changeStatus(
    @ReqBody('id') id: number,
    @ReqBody('status') status: USER_STATUS,
    @ReqBody('openTime') openTime: any
  ) {
    if (status !== USER_STATUS.FREEZE) {
      openTime = null
    } else {
      openTime = new Date(new Date(openTime).getTime())
    }
    await updateUser(
      {
        status,
        openTime
      },
      {
        id
      }
    )
  }

  @Put('password', power)
  async resetPassword(
    @ReqBody('id') id: number,
    @ReqBody('password') password: string,
    req: FWRequest
  ) {
    const user = await selectUserById(id)
    if (!user.length || !rPassword.test(password)) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '管理员重置用户密码: 参数不合法'
      })
      return Response.fail(500, '参数不合法')
    }
    delete req.body.password
    addBehavior(req, {
      module: 'super',
      data: req.body,
      msg: `管理员重置用户密码: ${user[0].account}`
    })
    await updateUser(
      {
        password: encryption(password)
      },
      {
        id
      }
    )
  }

  @Put('phone', power)
  async resetPhone(
    @ReqBody('id') id: number,
    @ReqBody('phone') phone: string,
    @ReqBody('code') code: string,
    req: FWRequest
  ) {
    const user = await selectUserById(id)
    if (!user.length || !rMobilePhone.test(phone) || !rVerCode.test(code)) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '管理员重置手机号: 参数不合法'
      })
      return Response.fail(500, '参数不合法')
    }
    const realCode = await getRedisVal(`code-${phone}`)
    if (realCode !== code) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '管理员重置手机号: 验证码错误'
      })
      return Response.failWithError(UserError.code.fault)
    }

    let [otherUser] = await selectUserByPhone(phone)
    if (!otherUser) {
      ;[otherUser] = await selectUserByAccount(phone)
    }
    if (otherUser) {
      addBehavior(req, {
        module: 'super',
        msg: `管理员重置手机号: 手机号 ${phone} 已存在`,
        data: req.body
      })
      return Response.failWithError(UserError.mobile.exist)
    }
    expiredRedisKey(`code-${phone}`)
    addBehavior(req, {
      module: 'super',
      data: req.body,
      msg: `管理员重置用户手机号: ${user[0].account}`
    })
    await updateUser(
      {
        phone
      },
      {
        id
      }
    )
  }
}
