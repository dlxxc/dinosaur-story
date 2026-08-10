// localStorage 封装工具：统一处理存储操作 + 异常捕获
// 设计原则：所有操作静默降级（存储失败不报错，只返回成功/失败状态）

const STORAGE_PREFIX = 'dinosaur_story_'

// Key 常量（避免魔法字符串）
export const STORAGE_KEYS = {
  READ_STORY_IDS: STORAGE_PREFIX + 'read_story_ids',   // 已读完的故事 ID 列表
  FONT_SIZE: STORAGE_PREFIX + 'font_size',             // 字号偏好 (small/medium/large)
  SPEED: STORAGE_PREFIX + 'speed'                      // 语速偏好 (slow/medium/fast)
}

// 判断 localStorage 是否可用（隐私模式/浏览器禁用时会失败）
function isAvailable() {
  try {
    const testKey = STORAGE_PREFIX + 'test'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch (e) {
    console.warn('localStorage 不可用，数据无法持久化保存：', e)
    return false
  }
}

const available = typeof window !== 'undefined' ? isAvailable() : false

// 读取数据（解析 JSON），失败返回 defaultValue
export function getStorage(key, defaultValue = null) {
  if (!available) return defaultValue
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null || raw === undefined) return defaultValue
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`读取 localStorage[${key}] 失败：`, e)
    return defaultValue
  }
}

// 写入数据（自动 JSON 序列化），返回是否成功
export function setStorage(key, value) {
  if (!available) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn(`写入 localStorage[${key}] 失败：`, e)
    return false
  }
}

// 删除某个 key
export function removeStorage(key) {
  if (!available) return false
  try {
    window.localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`删除 localStorage[${key}] 失败：`, e)
    return false
  }
}

// ========== 业务便捷方法 ==========

// 已读完列表
export function getReadStoryIds() {
  return getStorage(STORAGE_KEYS.READ_STORY_IDS, [])
}

export function setReadStoryIds(ids) {
  return setStorage(STORAGE_KEYS.READ_STORY_IDS, ids)
}

export function addReadStoryId(storyId) {
  const ids = getReadStoryIds()
  if (!ids.includes(storyId)) {
    ids.push(storyId)
    return setReadStoryIds(ids)
  }
  return true
}

export function clearReadStoryIds() {
  return setReadStoryIds([])
}

// 字号偏好
export function getFontSize(defaultValue = 'large') {
  return getStorage(STORAGE_KEYS.FONT_SIZE, defaultValue)
}

export function setFontSize(size) {
  return setStorage(STORAGE_KEYS.FONT_SIZE, size)
}

// 语速偏好
export function getSpeed(defaultValue = 'medium') {
  return getStorage(STORAGE_KEYS.SPEED, defaultValue)
}

export function setSpeed(speed) {
  return setStorage(STORAGE_KEYS.SPEED, speed)
}
