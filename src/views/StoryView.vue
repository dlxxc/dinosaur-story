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
    <div v-else class="story-content" ref="contentRef">
      <div v-for="(seg, segIndex) in story.segments" :key="segIndex" class="segment">
        <!-- 段落插图 -->
        <div class="segment-image">
          <img v-if="seg.image" :src="resolveAsset(seg.image)" :alt="`插图${segIndex + 1}`" />
          <div v-else class="image-placeholder">插图占位 {{ segIndex + 1 }}</div>
        </div>
        <!-- 段落文字 -->
        <p
          class="segment-text"
          :class="{ highlighted: isHighlighted(segIndex) }"
          :style="{ fontSize: fontSizeValue + 'px' }"
        >{{ seg.text }}</p>
      </div>
    </div>

    <!-- 底部操作栏（朗读控制 + 字号/语速 + 跳转） -->
    <div v-if="story" class="bottom-bar">
      <!-- 播放/暂停按钮 -->
      <button class="action-btn play-btn" @click="onPlayClick">
        {{ playButtonText }}
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

      <!-- 语速切换 -->
      <div class="switch-group">
        <span class="switch-label">语速</span>
        <div class="switch-options">
          <button
            v-for="speed in speeds"
            :key="speed.id"
            class="option-btn"
            :class="{ active: currentSpeed === speed.id }"
            @click="onSpeedChange(speed.id)"
          >{{ speed.name }}</button>
        </div>
      </div>

      <!-- 再听一遍 + 下一个 -->
      <div class="action-row">
        <button class="action-btn" @click="onReplayClick">再听一遍</button>
        <button class="action-btn" :disabled="!nextStory" @click="goNext">
          {{ nextStory ? '下一个故事' : '已是最后一个' }}
        </button>
      </div>
    </div>

    <!-- 不支持语音 / 错误提示弹窗 -->
    <div v-if="showTip" class="modal-mask" @click.self="showTip = false">
      <div class="modal-box">
        <p class="modal-text">{{ tipMessage }}</p>
        <button class="modal-btn confirm" @click="showTip = false">知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoryById, getNextStoryInCategory } from '../data/stories.js'
import { useSpeech } from '../utils/useSpeech.js'
import {
  getFontSize, setFontSize,
  getSpeed, setSpeed,
  addReadStoryId
} from '../utils/storage.js'

const route = useRoute()
const router = useRouter()

// 拼接 Vite base 路径（dev: '/' / prod: '/dinosaur-story/'）
const BASE_URL = import.meta.env.BASE_URL
function resolveAsset(path) {
  return BASE_URL + path.replace(/^\//, '')
}

// 直接使用 JS 数据（不再从 IndexedDB 读取缓存）
const story = computed(() => getStoryById(route.params.id))
const nextStory = computed(() => getNextStoryInCategory(route.params.id))

// 朗读状态
const isPlaying = ref(false)
const isPaused = ref(false)
const hasStarted = ref(false)  // 是否已开始过朗读（用于区分"未播放"和"已停止"）

// 当前高亮的段落索引
const highlightSeg = ref(-1)

// 提示弹窗
const showTip = ref(false)
const tipMessage = ref('')

function showTipMessage(message) {
  tipMessage.value = message
  showTip.value = true
}

// 字号
const fontSizes = [
  { id: 'small', name: '小', value: 16 },
  { id: 'medium', name: '中', value: 20 },
  { id: 'large', name: '大', value: 24 }
]
const currentFontSize = ref('large')
const fontSizeValue = computed(() => {
  return fontSizes.find(s => s.id === currentFontSize.value)?.value || 24
})

// 语速
const speeds = [
  { id: 'slow', name: '慢' },
  { id: 'medium', name: '适中' },
  { id: 'fast', name: '快' }
]
const currentSpeed = ref('medium')

// 初始化语音工具
const speech = useSpeech()

// 页面加载：从 localStorage 读取字号、语速偏好
onMounted(() => {
  const savedFontSize = getFontSize('large')
  const savedSpeed = getSpeed('medium')
  currentFontSize.value = savedFontSize
  currentSpeed.value = savedSpeed
  speech.setSpeed(savedSpeed)
})

// 字号变化：保存到 localStorage
watch(currentFontSize, (newVal) => {
  const ok = setFontSize(newVal)
  if (!ok) {
    showTipMessage('字号设置保存失败')
  }
})

// 语速变化：保存到 localStorage
watch(currentSpeed, (newVal) => {
  const ok = setSpeed(newVal)
  if (!ok) {
    showTipMessage('语速设置保存失败')
  }
})

// 配置语音回调
speech.setCallbacks({
  // 按"段"高亮（WAV 按段生成），segIndex 为当前播放段索引
  highlight: (segIndex) => {
    highlightSeg.value = segIndex
  },
  start: () => {
    isPlaying.value = true
    isPaused.value = false
    hasStarted.value = true
  },
  end: () => {
    isPlaying.value = false
    isPaused.value = false
    hasStarted.value = false
    highlightSeg.value = -1
    // 朗读全部结束 → 标记已读完
    if (story.value) {
      addReadStoryId(story.value.id)
    }
  },
  pause: () => {
    isPaused.value = true
    isPlaying.value = false
  },
  resume: () => {
    isPaused.value = false
    isPlaying.value = true
  }
})

// 播放按钮文字
const playButtonText = computed(() => {
  if (isPlaying.value) return '⏸ 暂停'
  if (isPaused.value) return '▶ 继续'
  return '▶ 播放'
})

// 判断某段是否高亮
function isHighlighted(segIndex) {
  return highlightSeg.value === segIndex
}

// 播放按钮点击
function onPlayClick() {
  if (!speech.isSupported()) {
    tipMessage.value = '当前浏览器不支持音频播放功能。'
    showTip.value = true
    return
  }
  if (!story.value) return

  if (isPlaying.value) {
    // 正在播放 → 暂停
    speech.pause()
  } else if (isPaused.value) {
    // 暂停中 → 继续
    speech.resume()
  } else {
    // 未播放 → 从头开始
    speech.start(story.value.segments)
  }
}

// 再听一遍
function onReplayClick() {
  if (!speech.isSupported()) {
    tipMessage.value = '当前浏览器不支持音频播放功能。'
    showTip.value = true
    return
  }
  if (!story.value) return
  speech.replay(story.value.segments)
}

// 语速切换
function onSpeedChange(speedId) {
  currentSpeed.value = speedId
  speech.setSpeed(speedId)
}

// 跳到下一个故事
function goNext() {
  // 离开前停止朗读
  speech.stop()
  if (nextStory.value) {
    router.push(`/story/${nextStory.value.id}`)
  }
}

// 返回首页
function goBack() {
  speech.stop()
  router.push('/')
}

// 组件卸载时停止朗读
onUnmounted(() => {
  speech.stop()
})
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
  transition: background-color 0.2s, color 0.2s;
  border-radius: 4px;
  padding: 2px 4px;
}

.segment-text.highlighted {
  background-color: #fff3cd;
  color: #856404;
  font-weight: 600;
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

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 80%;
  max-width: 300px;
  text-align: center;
}

.modal-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 20px;
}

.modal-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
}

.modal-btn.confirm {
  background: #4caf50;
  color: #fff;
}
</style>
