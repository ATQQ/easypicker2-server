/* eslint-disable no-loop-func */
import {
  Delete,
  FWRequest,
  Get,
  Post,
  Put,
  ReqBody,
  Response,
  RouterController
} from 'flash-wolves'
import dayjs from 'dayjs'
import SuperService from '@/service/super'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import type { User } from '@/db/model/user'
import {
  selectAllUser,
  selectUserByAccount,
  selectUserById,
  selectUserByPhone,
  updateUser
} from '@/db/userDb'
import { addBehavior } from '@/db/logDb'
import { rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'
import { encryption, formatSize } from '@/utils/stringUtil'
import { expiredRedisKey, getRedisVal } from '@/db/redisDb'
import { selectFiles } from '@/db/fileDb'
import { UserError } from '@/constants/errorMsg'
import FileService from '@/service/file'
import { batchDeleteFiles, getOSSFiles } from '@/utils/qiniuUtil'
import { MessageType } from '@/db/model/message'
import MessageService from '@/service/message'
import { ReqUserInfo } from '@/decorator'

const power = {
  userPower: USER_POWER.SUPER,
  needLogin: true
}

@RouterController('super/user', power)
export default class SuperUserController {
  @Post('message')
  async sendMessage(
    @ReqBody('type')
    type: MessageType,
    @ReqBody('text')
    text: string,
    @ReqUserInfo() user: User,
    @ReqBody('target')
    target?: number
  ) {
    // 数据格式校验
    if ((type === MessageType.USER_PUSH && !target) || !text.trim()) {
      return
    }
    if (type === MessageType.USER_PUSH) {
      MessageService.sendMessage(user.id, target, text)
    } else if (type === MessageType.GLOBAL_PUSH) {
      MessageService.sendGlobalMessage(user.id, text)
    }
  }

  @Get('message', {
    userPower: USER_POWER.NORMAL
  })
  async getMessageList(@ReqUserInfo() user: User) {
    const messageList = await MessageService.getMessageList(user.id)
    return messageList.map((v) => {
      return {
        id: v.id,
        type: v.type,
        style: v.style,
        date: v.date,
        text: v.text,
        read: v.read
      }
    })
  }

  @Put('message', {
    userPower: USER_POWER.NORMAL
  })
  readMessage(@ReqUserInfo() user: User, @ReqBody('id') id: string) {
    MessageService.readMessage(user.id, id)
  }

  /**
   * 获取用户列表
   */
  @Get('list')
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
    const files = await selectFiles({}, [
      'task_key',
      'user_id',
      'hash',
      'name',
      'date',
      'category_key'
    ])
    // 云文件数据
    const ossFiles = await SuperService.getOssFiles()
    const filesMap = new Map<string, Qiniu.ItemInfo>()
    ossFiles.forEach((v) => {
      filesMap.set(v.key, v)
    })

    // 兼容ep1网站数据
    const oldPrefixList = new Set(
      files
        .filter((v) => v.category_key)
        .map((v) => {
          return v.category_key.split('/')[0]
        })
        .filter((v) => !v.includes('"'))
        .filter((v) => !v.startsWith('easypicker2'))
    )

    for (const prefix of oldPrefixList) {
      const ossSources = await SuperService.getOssFilesByPrefix(`${prefix}/`)
      ossSources.forEach((v) => {
        filesMap.set(v.key, v)
      })
    }

    // 遍历用户，获取文件数和占用空间数据
    for (const user of users) {
      const fileInfo = files.filter((file) => file.user_id === user.id)
      let AMonthAgoSize = 0
      let AQuarterAgoSize = 0
      let AHalfYearAgoSize = 0
      const fileSize = fileInfo.reduce((pre, v) => {
        const { date } = v
        const ossKey = FileService.getOssKey(v)
        const { fsize = 0 } =
          filesMap.get(ossKey) || filesMap.get(v.category_key) || {}

        if (dayjs(date).isBefore(dayjs().subtract(1, 'month'))) {
          AMonthAgoSize += fsize
        }
        if (dayjs(date).isBefore(dayjs().subtract(3, 'month'))) {
          AQuarterAgoSize += fsize
        }
        if (dayjs(date).isBefore(dayjs().subtract(6, 'month'))) {
          AHalfYearAgoSize += fsize
        }

        return pre + fsize
      }, 0)

      Object.assign(user, {
        fileCount: fileInfo.length,
        resources: formatSize(fileSize),
        monthAgoSize: formatSize(AMonthAgoSize),
        quarterAgoSize: formatSize(AQuarterAgoSize),
        halfYearSize: formatSize(AHalfYearAgoSize)
      })
    }
    return {
      list: users.map((u) => ({
        ...u,
        phone: u?.phone?.slice(-4)
      }))
    }
  }

  @Delete('clear/oss')
  async clearOssFiles(
    @ReqBody('id') id: number,
    @ReqBody('type')
    type: 'month' | 'quarter' | 'half',
    @ReqUserInfo()
    userInfo: User
  ) {
    const user = (await selectUserById(id))[0]
    if (!user) {
      return
    }
    const months = {
      month: 1,
      quarter: 3,
      half: 6
    }
    if (!months[type]) {
      return
    }
    const beforeDate = dayjs().subtract(months[type], 'month')
    const files = (
      await selectFiles(
        {
          userId: id
        },
        ['task_key', 'user_id', 'hash', 'name', 'date']
      )
    ).filter((v) => {
      return dayjs(v.date).isBefore(beforeDate)
    })
    const delKeys = files.map(FileService.getOssKey)
    MessageService.sendMessage(
      userInfo.id,
      user.id,
      MessageService.clearMessageFormat('文件清理提醒', [
        `<strong style="font-weight: bold; color: rgb(71, 193, 168);">由于服务运维费用过高，系统已<span style="color:red;">自动清理 ${months[type]} 个月</span>之前收集的文件</strong>`,
        '如有特殊疑问，或者以后不希望被清理，请联系系统管理员Thanks♪(･ω･)ﾉ'
      ])
    )

    batchDeleteFiles(delKeys)
  }

  /**
   * 修改账号状态
   */
  @Put('status')
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

  @Put('password')
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

  @Put('phone')
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
