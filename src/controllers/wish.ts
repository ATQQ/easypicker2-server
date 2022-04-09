import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
} from 'flash-wolves'
import { Wish, WishStatus } from '@/db/model/wish'
import { addWishData } from '@/db/wishDb'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

const power = {
  needLogin: true,
}

@RouterController('wish')
export default class WishController {
  /**
   * 提交需求
   */
  @Post('add', power)
  async addWish(
    @ReqBody() body:Wish,
      req:FWRequest,
  ) {
    const user = await getUserInfo(req)

    const wish: Wish = {
      ...body,
      id: getUniqueKey(),
      userId: user.id,
      status: WishStatus.REVIEW,
    }
    await addWishData(wish)
  }
}
