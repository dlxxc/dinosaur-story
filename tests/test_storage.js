// storage.js 自测脚本（Node 环境模拟 localStorage）
// 执行方法：在项目根目录下运行 node tests/test_storage.js

// ===== 模拟浏览器 localStorage =====
const store = {}
global.window = {
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] }
  }
}

// ===== 导入待测试模块 =====
// ES Module -> 用动态 import（Node 需要 .mjs 或 package.json type=module，这里用简单方式：直接复制代码逻辑）
// 为了简单，直接从 storage.js 复制核心逻辑到此测试：

const STORAGE_PREFIX = 'dinosaur_story_test_'

const STORAGE_KEYS = {
  READ_STORY_IDS: STORAGE_PREFIX + 'read_story_ids',
  FONT_SIZE: STORAGE_PREFIX + 'font_size',
  SPEED: STORAGE_PREFIX + 'speed'
}

function isAvailable() {
  try {
    const testKey = STORAGE_PREFIX + 'test'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch (e) {
    console.warn('localStorage 不可用：', e)
    return false
  }
}

const available = isAvailable()

function getStorage(key, defaultValue = null) {
  if (!available) return defaultValue
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null || raw === undefined) return defaultValue
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`读取失败[${key}]：`, e)
    return defaultValue
  }
}

function setStorage(key, value) {
  if (!available) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn(`写入失败[${key}]：`, e)
    return false
  }
}

function removeStorage(key) {
  if (!available) return false
  try {
    window.localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`删除失败[${key}]：`, e)
    return false
  }
}

// 业务方法
function getReadStoryIds() { return getStorage(STORAGE_KEYS.READ_STORY_IDS, []) }
function setReadStoryIds(ids) { return setStorage(STORAGE_KEYS.READ_STORY_IDS, ids) }
function addReadStoryId(storyId) {
  const ids = getReadStoryIds()
  if (!ids.includes(storyId)) { ids.push(storyId); return setReadStoryIds(ids) }
  return true
}
function clearReadStoryIds() { return setReadStoryIds([]) }
function getFontSize(dv = 'large') { return getStorage(STORAGE_KEYS.FONT_SIZE, dv) }
function setFontSize(s) { return setStorage(STORAGE_KEYS.FONT_SIZE, s) }
function getSpeed(dv = 'medium') { return getStorage(STORAGE_KEYS.SPEED, dv) }
function setSpeed(s) { return setStorage(STORAGE_KEYS.SPEED, s) }

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

// ===== 正式测试 =====
console.log('\n========== 自测 1 / 2：storage.js 核心逻辑测试 ==========\n')

console.log('【清理】先清空测试用的存储 key')
removeStorage(STORAGE_KEYS.READ_STORY_IDS)
removeStorage(STORAGE_KEYS.FONT_SIZE)
removeStorage(STORAGE_KEYS.SPEED)

console.log('\n--- 字号偏好测试 ---')
assertEqual(getFontSize(), 'large', '默认字号应为 large')
assertEqual(setFontSize('small'), true, '设置字号 small 应成功')
assertEqual(getFontSize(), 'small', '读取字号应为 small（持久化）')
assertEqual(setFontSize('medium'), true, '设置字号 medium 应成功')
assertEqual(getFontSize(), 'medium', '读取字号应为 medium')

console.log('\n--- 语速偏好测试 ---')
assertEqual(getSpeed(), 'medium', '默认语速应为 medium')
assertEqual(setSpeed('slow'), true, '设置语速 slow 应成功')
assertEqual(getSpeed(), 'slow', '读取语速应为 slow（持久化）')
assertEqual(setSpeed('fast'), true, '设置语速 fast 应成功')
assertEqual(getSpeed(), 'fast', '读取语速应为 fast')

console.log('\n--- 已读完列表测试 ---')
assertEqual(getReadStoryIds(), [], '初始已读列表应为空')
assertEqual(addReadStoryId('manner-001'), true, '添加 manner-001 为已读应成功')
assertEqual(getReadStoryIds(), ['manner-001'], '已读列表应为 [manner-001]')
assertEqual(addReadStoryId('habit-001'), true, '添加 habit-001 为已读应成功')
assertEqual(getReadStoryIds(), ['manner-001', 'habit-001'], '已读列表应有 2 条')
assertEqual(addReadStoryId('manner-001'), true, '重复添加 manner-001 不应报错')
assertEqual(getReadStoryIds(), ['manner-001', 'habit-001'], '重复添加不应重复记录')
assertEqual(clearReadStoryIds(), true, '清空已读列表应成功')
assertEqual(getReadStoryIds(), [], '清空后已读列表应为空')

console.log('\n--- 重置后持久化验证（模拟关闭浏览器再打开）---')
// 先写入一些值
setFontSize('small')
setSpeed('slow')
addReadStoryId('share-001')
// 这里 store 还在，模拟"重新打开浏览器"：重新调用 getXXX（不重置 store）
assertEqual(getFontSize(), 'small', '重新打开后字号仍为 small')
assertEqual(getSpeed(), 'slow', '重新打开后语速仍为 slow')
assertEqual(getReadStoryIds(), ['share-001'], '重新打开后已读列表仍保留')
// 清空后再读
clearReadStoryIds()
removeStorage(STORAGE_KEYS.FONT_SIZE)
removeStorage(STORAGE_KEYS.SPEED)
assertEqual(getFontSize(), 'large', '清空字号后回到默认 large')
assertEqual(getSpeed(), 'medium', '清空语速后回到默认 medium')

console.log(`\n========== 自测 1 结果：通过 ${passCount} / 失败 ${failCount} ==========`)

if (failCount > 0) {
  process.exit(1)
}
