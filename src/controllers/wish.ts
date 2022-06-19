import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
} from 'flash-wolves'
import { Wish, WishStatus } from '@/db/model/wish'
import { addWishData } from '@/db/wishDb'
import { getUniqueKey } from '@/utils/stringUtil'
import { addBehavior } from '@/db/logDb'

@RouterController('wish')
export default class WishController {
  /**
   * 提交需求
   */
  @Post('add', { CORS: true })
  async addWish(
    @ReqBody() body:Wish,
      req:FWRequest,
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
}
