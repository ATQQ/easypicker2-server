import {
  FWRequest,
  FWResponse,
  RouterController,
  Post,
} from 'flash-wolves'
import { Wish, WishStatus } from '@/db/model/wish'
import { addWishData } from '@/db/wishDb'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

@RouterController('wish')
export default class WishRouter {
  @Post('add', {
    needLogin: true,
  })
  async add(
    req: FWRequest,
    res: FWResponse,
  ) {
    const user = await getUserInfo(req)
    const wish: Wish = {
      ...req.body,
      id: getUniqueKey(),
      userId: user.id,
      status: WishStatus.REVIEW,
    }
    await addWishData(wish)
    res.success()
  }
}
