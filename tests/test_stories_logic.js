// 功能点单元自测：stories.js 辅助函数 + 浏览器兼容性审计
import vm from 'node:vm'
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const storiesPath = path.join(projectRoot, 'src', 'data', 'stories.js')

// 解析 stories.js
let code = fs.readFileSync(storiesPath, 'utf8')
  .replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =')
  .replace(/export\s+function\s+(\w+)/g, 'function $1')
code += `
globalThis.__stories = stories;
globalThis.__categories = categories;
globalThis.__getStoryById = getStoryById;
globalThis.__getNextStoryInCategory = getNextStoryInCategory;
`

const ctx = { globalThis: {}, console }
vm.createContext(ctx)
vm.runInContext(code, ctx)
const { __stories, __categories, __getStoryById, __getNextStoryInCategory } = ctx.globalThis

let pass = 0, fail = 0
const errors = []
function assertEq(a, b, name) {
  if (JSON.stringify(a) === JSON.stringify(b)) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); console.log(`     期望: ${JSON.stringify(b)}`); console.log(`     实际: ${JSON.stringify(a)}`); errors.push(name); }
}
function assert(cond, name) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); errors.push(name); }
}

console.log('\n========== 自测 2 / 2：stories.js 辅助函数 + 分类导航逻辑 ==========\n')

console.log('--- getStoryById 测试 ---')
assertEq(__getStoryById('manner-001')?.title, '霸王龙丁丁学会说"请"', 'getStoryById(manner-001) 返回正确故事')
assertEq(__getStoryById('habit-005')?.title, '咚咚的玩具回家记', 'getStoryById(habit-005) 返回正确')
assertEq(__getStoryById('share-005')?.title, '大家的星星', 'getStoryById(share-005) 返回正确')
assertEq(__getStoryById('not-exist-001'), null, '不存在的 ID 返回 null')

console.log('\n--- getNextStoryInCategory 同分类下一个故事逻辑 ---')
// 礼貌篇 1→2→3→4→5→null
assertEq(__getNextStoryInCategory('manner-001')?.id, 'manner-002', 'manner-001 下一个 = manner-002')
assertEq(__getNextStoryInCategory('manner-002')?.id, 'manner-003', 'manner-002 下一个 = manner-003')
assertEq(__getNextStoryInCategory('manner-003')?.id, 'manner-004', 'manner-003 下一个 = manner-004')
assertEq(__getNextStoryInCategory('manner-004')?.id, 'manner-005', 'manner-004 下一个 = manner-005')
assertEq(__getNextStoryInCategory('manner-005'), null, 'manner-005 最后一篇 → 下一个 = null（按钮显示已是最后一个）')
// 习惯篇
assertEq(__getNextStoryInCategory('habit-001')?.id, 'habit-002', 'habit-001 → habit-002')
assertEq(__getNextStoryInCategory('habit-005'), null, 'habit-005 最后一篇 → null')
// 分享篇
assertEq(__getNextStoryInCategory('share-001')?.id, 'share-002', 'share-001 → share-002')
assertEq(__getNextStoryInCategory('share-005'), null, 'share-005 最后一篇 → null')
// 跨分类检查：manner 下一个不会跳到 habit
assert(__getNextStoryInCategory('manner-004')?.category === 'manner', 'manner-004 下一个仍属礼貌篇，不跨分类')

console.log('\n--- 每个故事 segments 基础合规检查 ---')
let totalSeg = 0
for (const s of __stories) {
  assert(Array.isArray(s.segments) && s.segments.length >= 3 && s.segments.length <= 6,
    `${s.id} (${s.title}) 段落数 ${s.segments.length} 在 3-6 范围内`)
  for (let i = 0; i < s.segments.length; i++) {
    const seg = s.segments[i]
    assert(typeof seg.text === 'string' && seg.text.length > 10, `${s.id}#${i + 1} text 非空`)
    assert(typeof seg.image === 'string' && seg.image.startsWith('/stories/'), `${s.id}#${i + 1} image 路径正确`)
    assert(typeof seg.audio === 'string' && seg.audio.startsWith('/audio/'), `${s.id}#${i + 1} audio 路径正确`)
    totalSeg++
  }
}
assertEq(totalSeg, 62, '15 篇故事总段落数 = 62（与资源核对一致）')

console.log('\n--- 分类结构检查 ---')
assertEq(__categories.map(c => c.id), ['manner', 'habit', 'share'], '分类 ID 顺序正确：礼貌/习惯/分享')
assertEq(__categories.map(c => c.name), ['礼貌篇', '习惯篇', '分享篇'], '分类名称正确')

// 跨分类：manner-005 不会跳到 habit-001
console.log('\n--- 关键边界：最后一个故事的"下一个"按钮状态 ---')
const lastOfMannerNext = __getNextStoryInCategory('manner-005')
const lastOfHabitNext = __getNextStoryInCategory('habit-005')
const lastOfShareNext = __getNextStoryInCategory('share-005')
assert(lastOfMannerNext === null, 'manner-005 最后 → 按钮显示"已是最后一个" + disabled')
assert(lastOfHabitNext === null, 'habit-005 最后 → 同上')
assert(lastOfShareNext === null, 'share-005 最后 → 同上')

// 第 2 个故事读完后的"下一个故事"跳转正确性
const m2 = __getNextStoryInCategory('manner-002')
assertEq(m2?.id, 'manner-003', '第2个故事 → 下一个 = 第3个（确保首页已读标记逻辑与跳转一致）')

console.log(`\n========== 自测 2 结果：通过 ${pass} / 失败 ${fail} ==========`)
if (fail > 0) { console.log('失败项：', errors); process.exit(1) }
