<template>
  <div class="story-view">
    <!-- 顶部导航栏 -->
    <header class="header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h1 class="story-title">{{ story ? story.title : '故事不存在' }}</h1>
    </header>

    <!-- 故事不存在提示 -->
    <div v-if="!story" class="empty-tip">
      <p>找不到这个故事。</p>
      <button class="back-btn" @click="goBack">返回首页</button>
    </div>

    <!-- 故事内容（上图下文，上下滚动） -->
    <div v-else class="story-content">
      <div v-for="(seg, index) in story.segments" :key="index" class="segment">
        <!-- 段落插图 -->
        <div class="segment-image">
          <img v-if="seg.image" :src="seg.image" :alt="`插图${index + 1}`" />
          <div v-else class="image-placeholder">插图占位 {{ index + 1 }}</div>
        </div>
        <!-- 段落文字 -->
        <p class="segment-text" :style="{ fontSize: fontSizeValue + 'px' }">
          {{ seg.text }}
        </p>
      </div>
    </div>

    <!-- 底部操作栏（朗读控制 + 字号/语速 + 跳转） -->
    <div v-if="story" class="bottom-bar">
      <!-- 播放按钮（阶段三实现朗读逻辑） -->
      <button class="action-btn play-btn" @click="onPlayClick">
        {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </button>

      <!-- 字号切换（阶段四实现持久化） -->
      <div class="switch-group">
        <span class="switch-label">字号</span>
        <div class="switch-options">
          <button
            v-for="size in fontSizes"
            :key="size.id"
            class="option-btn"
            :class="{ active: currentFontSize === size.id }"
            @click="currentFontSize = size.id"
          >{{ size.name }}</button>
        </div>
      </div>

      <!-- 语速切换（阶段四实现持久化） -->
      <div class="switch-group">
        <span class="switch-label">语速</span>
        <div class="switch-options">
          <button
            v-for="speed in speeds"
            :key="speed.id"
            class="option-btn"
            :class="{ active: currentSpeed === speed.id }"
            @click="currentSpeed = speed.id"
          >{{ speed.name }}</button>
        </div>
      </div>

      <!-- 再听一遍 + 下一个 -->
      <div class="action-row">
        <button class="action-btn" @click="replay">再听一遍</button>
        <button class="action-btn" :disabled="!nextStory" @click="goNext">
          {{ nextStory ? '下一个故事' : '已是最后一个' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoryById, getNextStoryInCategory } from '../data/stories.js'

const route = useRoute()
const router = useRouter()

const story = computed(() => getStoryById(route.params.id))
const nextStory = computed(() => getNextStoryInCategory(route.params.id))

// 朗读状态（阶段三实现真实朗读）
const isPlaying = ref(false)

// 字号（默认"大"，阶段四实现本地存储）
const fontSizes = [
  { id: 'small', name: '小', value: 16 },
  { id: 'medium', name: '中', value: 20 },
  { id: 'large', name: '大', value: 24 }
]
const currentFontSize = ref('large')
const fontSizeValue = computed(() => {
  return fontSizes.find(s => s.id === currentFontSize.value)?.value || 24
})

// 语速（默认"适中"，阶段四实现本地存储）
const speeds = [
  { id: 'slow', name: '慢' },
  { id: 'medium', name: '适中' },
  { id: 'fast', name: '快' }
]
const currentSpeed = ref('medium')

function onPlayClick() {
  // 阶段二仅切换按钮文字，阶段三接入真实语音
  isPlaying.value = !isPlaying.value
}

function replay() {
  // 阶段三实现重新朗读
  isPlaying.value = true
}

function goNext() {
  if (nextStory.value) {
    router.push(`/story/${nextStory.value.id}`)
  }
}

function goBack() {
  router.push('/')
}
</script>

<style scoped>
.story-view {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 14px;
  padding: 6px 10px;
  border: none;
  background: none;
  color: #4caf50;
  cursor: pointer;
  flex-shrink: 0;
}

.story-title {
  font-size: 17px;
  color: #333;
  margin-left: 8px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tip {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.empty-tip p {
  margin-bottom: 16px;
}

/* 故事内容区（可滚动） */
.story-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.segment {
  margin-bottom: 24px;
}

.segment-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  background: #f0f0f0;
}

.segment-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
  background: linear-gradient(135deg, #e8e8e8, #f5f5f5);
}

.segment-text {
  color: #333;
  line-height: 1.8;
  text-align: justify;
}

/* 底部操作栏 */
.bottom-bar {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  bottom: 0;
}

.play-btn {
  background: #4caf50;
  color: #fff;
  font-size: 16px;
  padding: 12px;
  border-radius: 8px;
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 13px;
  color: #666;
  width: 36px;
  flex-shrink: 0;
}

.switch-options {
  display: flex;
  gap: 6px;
  flex: 1;
}

.option-btn {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
}

.option-btn.active {
  background: #4caf50;
  color: #fff;
  border-color: #4caf50;
}

.action-row {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
}

.action-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.action-btn:active:not(:disabled) {
  background: #f5f5f5;
}
</style>
