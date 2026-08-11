// 资源完整性核对脚本 v2
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const projectRoot = process.cwd()
const publicDir = path.join(projectRoot, 'public')
const storiesPath = path.join(projectRoot, 'src', 'data', 'stories.js')

// 读文件并做转换
let storiesCode = fs.readFileSync(storiesPath, 'utf8')
  .replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =')
  .replace(/export\s+function\s+(\w+)/g, 'function $1')
storiesCode += '\nglobalThis.__stories = stories; globalThis.__categories = categories;'

const ctx = { globalThis: {}, console }
vm.createContext(ctx)
try {
  vm.runInContext(storiesCode, ctx)
} catch (e) {
  console.error('❌ stories.js 解析失败:', e.message)
  process.exit(1)
}

const stories = ctx.globalThis.__stories
const categories = ctx.globalThis.__categories

if (!Array.isArray(stories)) {
  console.error('❌ stories 不是数组')
  process.exit(1)
}

let pass = 0
let fail = 0
const errors = []
let totalSegments = 0
const imageSet = new Set()
const audioSet = new Set()

for (const story of stories) {
  for (let i = 0; i < story.segments.length; i++) {
    const seg = story.segments[i]
    totalSegments++

    if (seg.image) {
      const imgPath = path.join(publicDir, seg.image)
      if (fs.existsSync(imgPath)) { imageSet.add(seg.image); pass++ }
      else { fail++; errors.push(`[图片缺失] 故事${story.id} 段${i+1}: ${seg.image}`) }
    } else { fail++; errors.push(`[image字段缺失] 故事${story.id} 段${i+1}`) }

    if (seg.audio) {
      const audPath = path.join(publicDir, seg.audio)
      if (fs.existsSync(audPath)) { audioSet.add(seg.audio); pass++ }
      else { fail++; errors.push(`[音频缺失] 故事${story.id} 段${i+1}: ${seg.audio}`) }
    } else { fail++; errors.push(`[audio字段缺失] 故事${story.id} 段${i+1}`) }

    if (seg.image && seg.audio) {
      const imgLeaf = seg.image.split('/').pop().replace(/\.[^.]+$/, '')
      const audLeaf = seg.audio.split('/').pop().replace(/\.wav$/, '')
      if (imgLeaf !== audLeaf) errors.push(`[命名不一致] ${story.id}#${i+1}: img=${imgLeaf}, aud=${audLeaf}`)
    }
  }
}

// 分类数量检查
const catIds = categories.map(c => c.id)
const catCountOk = { manner: 0, habit: 0, share: 0 }
for (const s of stories) { if (s.category in catCountOk) catCountOk[s.category]++ }
if (catCountOk.manner !== 5 || catCountOk.habit !== 5 || catCountOk.share !== 5) {
  errors.push(`[分类数量] 礼貌=${catCountOk.manner}/5, 习惯=${catCountOk.habit}/5, 分享=${catCountOk.share}/5`)
}

// 反向检查：多余图片
const storyImages = fs.readdirSync(path.join(publicDir, 'stories')).filter(f => f.endsWith('.jpg'))
const usedStories = [...imageSet].map(p => p.split('/').pop())
const unusedImages = storyImages.filter(f => !usedStories.includes(f))

let audioCount = 0
const audioDir = path.join(publicDir, 'audio')
for (const dir of fs.readdirSync(audioDir)) {
  const sub = path.join(audioDir, dir)
  if (fs.statSync(sub).isDirectory()) {
    for (const f of fs.readdirSync(sub)) if (f.endsWith('.wav')) audioCount++
  }
}

console.log('========== 资源完整性核对报告 ==========')
console.log('\n📊 基础统计')
console.log(`  分类: ${categories.map(c => c.name).join(' / ')}`)
console.log(`  故事数: ${stories.length}  (礼貌${catCountOk.manner}/习惯${catCountOk.habit}/分享${catCountOk.share})`)
console.log(`  段落总数: ${totalSegments}`)
console.log(`  声明图片: ${imageSet.size}   实际图片: ${storyImages.length}`)
console.log(`  声明音频: ${audioSet.size}   实际音频 WAV: ${audioCount}`)
console.log(`\n✅ 匹配成功: ${pass}`)
console.log(`❌ 匹配失败: ${fail}`)

if (unusedImages.length > 0) {
  console.log(`\n⚠️  目录里多余的未引用图片 (${unusedImages.length}): `, unusedImages.slice(0, 10).join(', '), unusedImages.length > 10 ? `...还有${unusedImages.length-10}张` : '')
}

if (errors.length > 0) {
  console.log('\n❌ 错误/警告:')
  for (const e of errors) console.log('  ' + e)
  process.exit(1)
} else {
  console.log('\n🎉 全部通过：资源一一对应，无缺失无命名不一致，分类数量正确')
}
