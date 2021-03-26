import { encryption } from '../src/utils/stringUtil'

test('encode 66666 = rotaomo64xYS7sHR9v+86Q==', () => {
    expect(encryption('66666')).toBe('rotaomo64xYS7sHR9v+86Q==')
})
