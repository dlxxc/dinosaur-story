// IndexedDB 封装工具：用于离线下载功能
// 存储结构：downloaded_stories 对象仓库
//   key: storyId（如 'manner-001'）
//   value: { id, title, category, segments, downloadTime }
// 所有操作返回 Promise，失败时 reject 并附带错误信息

const DB_NAME = 'dinosaur_story_db'
const DB_VERSION = 1
const STORE_NAME = 'downloaded_stories'

// 判断 IndexedDB 是否可用
function isSupported() {
  return typeof indexedDB !== 'undefined'
}

// 打开数据库（不存在则创建），返回 Promise<IDBDatabase>
function openDB() {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error('当前浏览器不支持 IndexedDB，无法使用离线下载功能'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      // 如果对象仓库不存在，创建它（keyPath 设为 id）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// 存储一个故事到 IndexedDB（下载用）
// storyData: { id, title, category, segments: [{ image, text }] }
async function saveStory(storyData) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    // 附带下载时间
    const data = { ...storyData, downloadTime: Date.now() }
    const request = store.put(data)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

// 从 IndexedDB 读取一个故事
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

// 删除一个已下载的故事
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

// 获取所有已下载的故事 ID 列表
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

// 检查某个故事是否已下载
async function isDownloaded(storyId) {
  const story = await getStory(storyId)
  return story !== null
}

export {
  isSupported,
  saveStory,
  getStory,
  deleteStory,
  getDownloadedIds,
  isDownloaded
}
