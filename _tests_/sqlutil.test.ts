import { selectTableByModel, deleteTableByModel, insertTableByModel, updateTableByModel, insertTableByModelMany } from '../src/utils/sqlUtil'

test('selectTableByModel("user")', () => {
    const { sql, params } = selectTableByModel('user')
    expect(sql).toBe('select * from user')
    expect(params).toEqual([])
})

test('selectTableByModel("user",{})', () => {
    const { sql, params } = selectTableByModel('user', {})
    expect(sql).toBe('select * from user')
    expect(params).toEqual([])
})

test('selectTableByModel("user",{name:"xm"})', () => {
    const { sql, params } = selectTableByModel('user', { data: { name: 'xm' } })
    expect(sql).toBe('select * from user where name = ?')
    expect(params).toEqual(['xm'])
})

test('selectTableByModel("user",{name:"xm"},["id","birthday"])', () => {
    const { sql, params } = selectTableByModel('user', {
        data: { name: 'xm' },
        columns: ['id', 'birthday']
    })
    expect(sql).toBe('select id,birthday from user where name = ?')
    expect(params).toEqual(['xm'])
})

test('selectTableByModel("user",{name:"xm",id:1})', () => {
    const { sql, params } = selectTableByModel('user', {
        data: { name: 'xm', id: 1 }
    })
    expect(sql).toBe('select * from user where name = ? and id = ?')
    expect(params).toEqual(['xm', 1])
})

test('selectTableByModel("user",{},[])', () => {
    const { sql, params } = selectTableByModel('user', {
        data: {},
        columns: []
    })
    expect(sql).toBe('select * from user')
    expect(params).toEqual([])
})

test('selectTableByModel("user",{},["id", "name"])', () => {
    const { sql, params } = selectTableByModel('user', {
        data: {},
        columns: ['id', 'name']
    })
    expect(sql).toBe('select id,name from user')
    expect(params).toEqual([])
})

test('selectTableByModel("user",{pwd:"123456",taskName:"task1"},["id", "name"])', () => {
    const { sql, params } = selectTableByModel('user', {
        data: { pwd: '123456', taskName: 'task1' },
        columns: ['id', 'name']
    })
    expect(sql).toBe('select id,name from user where pwd = ? and task_name = ?')
    expect(params).toEqual(['123456', 'task1'])
})

test('deleteTableByModel("user",{pwd:"123456",taskName:"task1"})', () => {
    const { sql, params } = deleteTableByModel('user', { pwd: '123456', taskName: 'task1' })
    expect(sql).toBe('delete from user where pwd = ? and task_name = ?')
    expect(params).toEqual(['123456', 'task1'])
})

test('deleteTableByModel("user","")', () => {
    const { sql, params } = deleteTableByModel('user', '')
    expect(sql).toBe('')
    expect(params).toEqual([])
})

test('insertTableByModel("user","")', () => {
    const { sql, params } = insertTableByModel('user', '')
    expect(sql).toBe('')
    expect(params).toEqual([])
})

test('insertTableByModel("user",{name:"xm",age:18})', () => {
    const { sql, params } = insertTableByModel('user', { name: 'xm', age: 18 })
    expect(sql).toBe('insert into user (name,age) values (?,?)')
    expect(params).toEqual(['xm', 18])
})

test('updateTableByModel("user",{name:"xm",age:18},{id:1})', () => {
    const { sql, params } = updateTableByModel('user', { name: 'xm', age: 18 }, { id: 1 })
    expect(sql).toBe('update user set name = ?,age = ? where id = ?')
    expect(params).toEqual(['xm', 18, 1])
})

test('insertMany', () => {
    const { sql, params } = insertTableByModelMany('people', [{ name: 'xm', age: 18 }, { name: 'kk', age: 19 }, { name: 'ds', age: 20 }])
    expect(sql).toBe('insert into people (name,age) values (?,?),(?,?),(?,?)')
    expect(params).toEqual(['xm', 18, 'kk', 19, 'ds', 20])
})