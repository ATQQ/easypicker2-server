import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
  Get,
  Put,
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
    return wishes.map((wish) => {
      const {
        title, des, status, id, contact,
      } = wish
      const createDare = getObjectIdDate(id)
      return {
        title, des, status, id, contact, createDare,
      }
    })
  }

  @Put('update', adminPower)
  async updateWishStatus(@ReqBody('id') id: string, @ReqBody('status') status: WishStatus) {
    await updateWish({ id }, { $set: { status } })
  }
}
