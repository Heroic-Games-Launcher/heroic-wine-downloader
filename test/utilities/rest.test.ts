import { writeFileSync } from 'graceful-fs'
import { getFolderSize, unlinkFile } from '../../src/utilities'

// run test
describe('Utilities - Rest', () => {
  test('get folder size successful', () => {
    const size = getFolderSize('.')
    expect(typeof size).toBe('number')
    expect(size).not.toBeNaN()
    expect(size).not.toBeNull()
    expect(size).toBeGreaterThan(0)
  })

  test('get folder size of non existing folder returns NaN', () => {
    const size = getFolderSize('./not_existing')
    expect(typeof size).toBe('number')
    expect(size).toBeNaN()
  })

  test('unlink file fails', () => {
    expect(unlinkFile('newFile.txt')).toBeFalsy()
  })

  test('unlink files succeeds', () => {
    writeFileSync('newFile.txt', 'Hello new file!')
    expect(unlinkFile('newFile.txt')).toBeTruthy()
  })
})
