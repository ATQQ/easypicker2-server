import { FilterQuery, UpdateQuery } from 'mongodb'
import {
  findCollection,
  findCollectionCount,
  insertCollection,
  updateCollection
} from '@/lib/dbConnect/mongodb'
import { Action } from './model/action'
import { getUniqueKey } from '@/utils/stringUtil'

export function addAction(action: Partial<Action>) {
  Object.assign<any, Partial<Action>>(action, {
    id: getUniqueKey(),
    date: new Date()
  })
  return insertCollection<any>('action', action)
}

export function findActionCount(query: FilterQuery<Action>) {
  return findCollectionCount<Action>('action', query)
}

export function findAction(action: FilterQuery<Action>) {
  return findCollection<Action>('action', action)
}

export function updateAction(
  query: FilterQuery<Action>,
  action: UpdateQuery<Action>
) {
  return updateCollection<Action>('action', query, action)
}
