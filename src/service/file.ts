import { File } from '@/db/model/file'

class FileService {
  getOssKey(file: File) {
    // return `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    // 特殊要求去掉hash
    return `easypicker2/${file.task_key}/${file.name}`
  }
}

export default new FileService()
