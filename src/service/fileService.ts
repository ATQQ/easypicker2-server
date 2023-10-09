import { InjectCtx, Provide, Context, Inject } from 'flash-wolves'
import { Files } from '@/db/entity'
import { FileRepository } from '@/db/fileDb'

@Provide()
export default class FileService {
  @InjectCtx()
  private Ctx: Context

  @Inject(FileRepository)
  private fileRepository: FileRepository

  async selectFilesLimitCount(options: Partial<Files>, count: number) {
    return this.fileRepository.findWithLimitCount(options, count, {
      id: 'DESC'
    })
  }
}
