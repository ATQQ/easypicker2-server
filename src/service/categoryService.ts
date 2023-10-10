import { Inject, InjectCtx, Context, Provide } from 'flash-wolves'
import { CategoryRepository } from '@/db/categoryDb'
import BehaviorService from './behaviorService'
import { CategoryError } from '@/constants/errorMsg'
import { Category } from '@/db/entity'
import { getUniqueKey } from '@/utils/stringUtil'

@Provide()
export default class CategoryService {
  @InjectCtx()
  private ctx: Context

  @Inject(CategoryRepository)
  private categoryRepository: CategoryRepository

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  async createCategory(name: string) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const categories = await this.categoryRepository.findMany({
      userId,
      name
    })

    // 分类已存在
    if (categories.length !== 0) {
      this.behaviorService.add(
        'category',
        `创建分类失败(已存在) 用户:${logAccount} 名称:${name}`,
        {
          name,
          account: logAccount
        }
      )
      throw CategoryError.exist
    }
    this.behaviorService.add(
      'category',
      `创建分类成功 用户:${logAccount} 名称:${name}`,
      {
        name,
        account: logAccount
      }
    )
    const category = new Category()
    category.userId = userId
    category.name = name
    category.k = getUniqueKey()
    await this.categoryRepository.insert(category)
  }
}
