// 故事数据（占位内容，仅为阶段二骨架展示用，真实故事内容待阶段六逐篇确认）
// 主角约束：所有故事主角必须是拟人化的恐龙

export const categories = [
  { id: 'manner', name: '礼貌篇' },
  { id: 'habit', name: '习惯篇' },
  { id: 'share', name: '分享篇' }
]

export const stories = [
  {
    id: 'manner-001',
    title: '小恐龙说谢谢（示例占位）',
    category: 'manner',
    segments: [
      { image: '', text: '【占位段落1】这里是第一段故事内容，主角是一只拟人化的小恐龙。' },
      { image: '', text: '【占位段落2】这里是第二段故事内容，配有插图。' },
      { image: '', text: '【占位段落3】这里是第三段故事内容，故事结束。' }
    ]
  },
  {
    id: 'manner-002',
    title: '小恐龙学道歉（示例占位）',
    category: 'manner',
    segments: [
      { image: '', text: '【占位段落1】这里是第一段故事内容。' },
      { image: '', text: '【占位段落2】这里是第二段故事内容。' }
    ]
  },
  {
    id: 'habit-001',
    title: '小恐龙按时睡觉（示例占位）',
    category: 'habit',
    segments: [
      { image: '', text: '【占位段落1】这里是第一段故事内容。' },
      { image: '', text: '【占位段落2】这里是第二段故事内容。' }
    ]
  },
  {
    id: 'habit-002',
    title: '小恐龙爱刷牙（示例占位）',
    category: 'habit',
    segments: [
      { image: '', text: '【占位段落1】这里是第一段故事内容。' },
      { image: '', text: '【占位段落2】这里是第二段故事内容。' }
    ]
  },
  {
    id: 'share-001',
    title: '小恐龙分水果（示例占位）',
    category: 'share',
    segments: [
      { image: '', text: '【占位段落1】这里是第一段故事内容。' },
      { image: '', text: '【占位段落2】这里是第二段故事内容。' }
    ]
  },
  {
    id: 'share-002',
    title: '小恐龙一起玩（示例占位）',
    category: 'share',
    segments: [
      { image: '', text: '【占位段落1】这里是第一段故事内容。' },
      { image: '', text: '【占位段落2】这里是第二段故事内容。' }
    ]
  }
]

// 根据 ID 获取故事
export function getStoryById(id) {
  return stories.find(s => s.id === id)
}

// 获取同分类的下一个故事
export function getNextStoryInCategory(currentId) {
  const current = getStoryById(currentId)
  if (!current) return null
  const sameCategory = stories.filter(s => s.category === current.category)
  const index = sameCategory.findIndex(s => s.id === currentId)
  if (index === -1 || index === sameCategory.length - 1) return null
  return sameCategory[index + 1]
}
