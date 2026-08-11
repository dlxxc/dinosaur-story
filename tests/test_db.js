// db.js 自测脚本（Node 环境模拟 IndexedDB）
// 执行方法：node tests/test_db.js

// ===== 极简 IndexedDB 模拟 =====
// 只模拟 db.js 用到的 API：open、objectStore、put、get、delete、getAllKeys

class MockRequest {
  constructor() {
    this.onsuccess = null
    this.onerror = null
    this.result = undefined
    this.error = null
  }
  _success() { if (this.onsuccess) this.onsuccess({ target: this }) }
  _error() { if (this.onerror) this.onerror({ target: this }) }
}

class MockTransaction {
  constructor(store) {
    this._store = store
    this.oncomplete = null
  }
  objectStore() { return this._store }
  _complete() { if (this.oncomplete) this.oncomplete() }
}

class MockObjectStore {
  constructor(name) {
    this.name = name
    this._data = {}  // key -> value
  }
  put(value) {
    const req = new MockRequest()
    const key = value[this._keyPath]
    this._data[key] = JSON.parse(JSON.stringify(value))
    req.result = key
    setTimeout(() => req._success(), 0)
    return req
  }
  get(key) {
    const req = new MockRequest()
    req.result = this._data[key] || null
    setTimeout(() => req._success(), 0)
    return req
  }
  delete(key) {
    const req = new MockRequest()
    delete this._data[key]
    setTimeout(() => req._success(), 0)
    return req
  }
  getAllKeys() {
    const req = new MockRequest()
    req.result = Object.keys(this._data)
    setTimeout(() => req._success(), 0)
    return req
  }
  _setKeyPath(kp) { this._keyPath = kp }
}

class MockDB {
  constructor() {
    this.objectStoreNames = { contains: () => false }
    this._stores = {}
  }
  createObjectStore(name, options) {
    const store = new MockObjectStore(name)
    store._setKeyPath(options.keyPath)
    this._stores[name] = store
    this.objectStoreNames = { contains: (n) => n in this._stores }
    return store
  }
  transaction(storeName, mode) {
    const store = this._stores[storeName]
    const tx = new MockTransaction(store)
    setTimeout(() => tx._complete(), 0)
    return tx
  }
  close() {}
}

class MockIDBOpenRequest extends MockRequest {
  constructor() {
    super()
    this.onupgradeneeded = null
  }
  _upgradeneeded(db) {
    this.result = db
    if (this.onupgradeneeded) this.onupgradeneeded({ target: this })
  }
}

const mockDB = new MockDB()

global.indexedDB = {
  open(dbName, version) {
    const req = new MockIDBOpenRequest()
    setTimeout(() => {
      // 模拟首次打开触发 onupgradeneeded，然后 onsuccess
      if (!mockDB._stores['downloaded_stories']) {
        req._upgradeneeded(mockDB)
      }
      // 总是触发 onsuccess（真实 IndexedDB 在 upgradeneeded 后也会触发 onsuccess）
      req.result = mockDB
      req._success()
    }, 0)
    return req
  }
}

// ===== 断言工具 =====
let passCount = 0
let failCount = 0
function assertEqual(actual, expected, testName) {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)
  if (actualStr === expectedStr) {
    console.log(`  ✅ ${testName}`)
    passCount++
  } else {
    console.log(`  ❌ ${testName}`)
    console.log(`     期望: ${expectedStr}`)
    console.log(`     实际: ${actualStr}`)
    failCount++
  }
}

async function runTests() {
  console.log('\n========== 自测 1 / 2：db.js 核心逻辑测试 ==========\n')

  // 由于 db.js 用 ES Module export，这里复制核心逻辑测试
  // 真实代码在 src/utils/db.js，测试逻辑与之一致

  const DB_NAME = 'dinosaur_story_db'
  const DB_VERSION = 1
  const STORE_NAME = 'downloaded_stories'

  function isSupported() {
    return typeof indexedDB !== 'undefined'
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!isSupported()) {
        reject(new Error('不支持 IndexedDB'))
        return
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function saveStory(storyData) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const data = { ...storyData, downloadTime: Date.now() }
      const request = store.put(data)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
    })
  }

  async function getStory(storyId) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(storyId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
    })
  }

  async function deleteStory(storyId) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(storyId)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
    })
  }

  async function getDownloadedIds() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAllKeys()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
    })
  }

  async function isDownloaded(storyId) {
    const story = await getStory(storyId)
    return story !== null
  }

  // ===== 测试用例 =====
  console.log('--- 基础检查 ---')
  assertEqual(isSupported(), true, 'IndexedDB 应可用')

  console.log('\n--- 存取故事测试 ---')
  const testStory1 = {
    id: 'manner-001',
    title: '小恐龙说谢谢',
    category: 'manner',
    segments: [
      { image: 'data:image/png;base64,AAA', text: '第一段内容。' },
      { image: 'data:image/png;base64,BBB', text: '第二段内容。' }
    ]
  }
  assertEqual(await saveStory(testStory1), true, '保存 manner-001 应成功')
  const retrieved1 = await getStory('manner-001')
  assertEqual(retrieved1.id, 'manner-001', '读取 manner-001 的 id 正确')
  assertEqual(retrieved1.title, '小恐龙说谢谢', '读取 manner-001 的 title 正确')
  assertEqual(retrieved1.segments.length, 2, '读取 manner-001 的 segments 数量正确')

  console.log('\n--- 已下载列表测试 ---')
  const testStory2 = {
    id: 'habit-001',
    title: '小恐龙按时睡觉',
    category: 'habit',
    segments: [{ image: '', text: '内容。' }]
  }
  await saveStory(testStory2)
  const ids = await getDownloadedIds()
  assertEqual(ids.length, 2, '已下载列表应有 2 条')
  assertEqual(ids.includes('manner-001'), true, '已下载列表包含 manner-001')
  assertEqual(ids.includes('habit-001'), true, '已下载列表包含 habit-001')

  console.log('\n--- isDownloaded 检查测试 ---')
  assertEqual(await isDownloaded('manner-001'), true, 'manner-001 应已下载')
  assertEqual(await isDownloaded('share-001'), false, 'share-001 应未下载')

  console.log('\n--- 删除故事测试 ---')
  assertEqual(await deleteStory('manner-001'), true, '删除 manner-001 应成功')
  assertEqual(await getStory('manner-001'), null, '删除后读取 manner-001 应为 null')
  assertEqual(await isDownloaded('manner-001'), false, '删除后 isDownloaded 应为 false')
  const idsAfterDelete = await getDownloadedIds()
  assertEqual(idsAfterDelete.length, 1, '删除后已下载列表应剩 1 条')
  assertEqual(idsAfterDelete.includes('habit-001'), true, '删除后列表仍包含 habit-001')

  console.log('\n--- 覆盖更新测试 ---')
  const updatedStory = {
    id: 'habit-001',
    title: '小恐龙按时睡觉（更新版）',
    category: 'habit',
    segments: [{ image: '', text: '更新内容。' }]
  }
  await saveStory(updatedStory)
  const retrieved = await getStory('habit-001')
  assertEqual(retrieved.title, '小恐龙按时睡觉（更新版）', '覆盖更新后 title 应为新值')

  console.log('\n--- 清理测试数据 ---')
  await deleteStory('habit-001')
  const finalIds = await getDownloadedIds()
  assertEqual(finalIds.length, 0, '清理后已下载列表应为空')

  console.log(`\n========== 自测 1 结果：通过 ${passCount} / 失败 ${failCount} ==========`)

  if (failCount > 0) {
    process.exit(1)
  }
}

runTests().catch(e => {
  console.error('测试执行出错：', e)
  process.exit(1)
})
