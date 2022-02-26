import { insertCollection } from '@/lib/dbConnect/mongodb'
import { Wish } from './model/wish'

export function addWishData(wish:Wish) {
  return insertCollection<Wish>('wish', wish)
}
