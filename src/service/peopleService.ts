import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import { People } from '@/db/entity'
import { BehaviorService } from '@/service'
import { peopleError } from '@/constants/errorMsg'
import { PeopleRepository } from '@/db/peopleDb'

@Provide()
export default class PeopleService {
  @InjectCtx()
  private ctx: Context

  @Inject(PeopleRepository)
  private peopleRepository: PeopleRepository

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  async addPeople(key: string, name: string) {
    const user = this.ctx.req.userInfo
    const exist = !!(await this.peopleRepository.findOne({
      taskKey: key,
      userId: user.id,
      name
    }))

    this.behaviorService.add(
      'people',
      `直接添加成员${exist ? '失败' : '成功'}: ${name}`,
      {
        name,
        exist
      }
    )
    if (exist) {
      throw peopleError.exist
    }

    const people = new People()
    people.name = name
    people.taskKey = key
    people.userId = user.id
    await this.peopleRepository.insert(people)
  }
}
