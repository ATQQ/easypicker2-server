import { InjectCtx, Provide, Context, Inject } from 'flash-wolves'
import { Files } from '@/db/entity'
import { FileRepository } from '@/db/fileDb'
import { File } from '@/db/model/file'

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

  getOssKey(file: File) {
    return `easypicker2/${file.task_key}/${file.hash}/${file.name}`
  }
}
