import {
  Context,
  Inject,
  InjectCtx,
  Post,
  ReqBody,
  RouterController
} from 'flash-wolves'
import { CategoryService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

@RouterController('category', { needLogin: true })
export default class CategoryController {
  @InjectCtx()
  private ctx: Context

  @Inject(CategoryService)
  private categoryService: CategoryService

  @Post('create')
  createCategory(@ReqBody('name') name: string) {
    try {
      return this.categoryService.createCategory(name)
    } catch (error) {
      return wrapperCatchError(error)
    }
  }
}
