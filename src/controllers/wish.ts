import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
  Get,
  Put,
  ReqParams,
} from 'flash-wolves'
import { Wish, WishStatus } from '@/db/model/wish'
import { addWishData, findWish, updateWish } from '@/db/wishDb'
import { getObjectIdDate, getUniqueKey } from '@/utils/stringUtil'
import { addBehavior } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'

const adminPower = { needLogin: true, userPower: USER_POWER.SUPER }
@RouterController('wish')
export default class WishController {
  /**
   * 提交需求
   */
  @Post('add', { CORS: true })
  async addWish(
    @ReqBody() body: Wish,
      req: FWRequest,
  ) {
    addBehavior(req, {
      module: 'wish',
      msg: '需求反馈',
      data: body,
    })

    const wish: Wish = {
      ...body,
      id: getUniqueKey(),
      status: WishStatus.REVIEW,
    }
    await addWishData(wish)
  }

  @Get('all', adminPower)
  async getAllWish() {
    const wishes = await findWish({})
    // 按照日期从大到小排序
    wishes.sort((a, b) => {
      const aDate = getObjectIdDate(a.id)
      const bDate = getObjectIdDate(b.id)
      return bDate - aDate
    })
    return wishes.map((wish) => {
      const {
        title, des, status, id, contact,
      } = wish
      const createDate = getObjectIdDate(id)
      return {
        title, des, status, id, contact, createDate,
      }
    })
  }

  @Put('update', adminPower)
  async updateWishStatus(@ReqBody('id') id: string, @ReqBody('status') status: WishStatus) {
    await updateWish({ id }, { $set: { status } })
  }

  @Put('update/:id', adminPower)
  async updateWish(@ReqParams('id') id: string, @ReqBody() body: Wish) {
    const { title, des } = body
    await updateWish({ id }, { $set: { title, des } })
  }
}
