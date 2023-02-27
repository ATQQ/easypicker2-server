import {
  findCollection,
  insertCollection,
  updateCollection
} from '@/lib/dbConnect/mongodb'
import { getUniqueKey } from '@/utils/stringUtil'
import { Message, MessageStyle, MessageType } from '../db/model/message'
import { selectAllUser } from '../db/userDb'

class MessageService {
  sendMessage(source: number, target: number, text: string) {
    return insertCollection<Message>('message', {
      id: getUniqueKey(),
      source,
      target,
      type: MessageType.USER_PUSH,
      style: MessageStyle.Dialog,
      date: new Date(),
      text,
      read: false
    })
  }

  async sendGlobalMessage(source: number, text: string) {
    const users = await selectAllUser(['id'])
    return insertCollection<Message>(
      'message',
      users.map((u) => {
        return {
          id: getUniqueKey(),
          source,
          target: u.id,
          type: MessageType.USER_PUSH,
          style: MessageStyle.Dialog,
          date: new Date(),
          text,
          read: false
        }
      }),
      true
    )
  }

  getMessageList(userId: number) {
    return findCollection<Message>('message', { target: userId })
  }

  readMessage(userId: number, msgId: string) {
    return updateCollection<Message>(
      'message',
      { target: userId, id: msgId },
      {
        $set: {
          read: true
        }
      }
    )
  }
}

export default new MessageService()
