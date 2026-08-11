<template>
  <div class="home-view">
    <!-- 顶部标题栏 -->
    <header class="header">
      <h1 class="title">恐龙教养故事</h1>
      <button class="reset-btn" @click="showResetConfirm = true" title="重置已读完标记">
        重置进度
      </button>
    </header>

    <!-- 分类折叠列表 -->
    <div class="category-list">
      <div v-for="cat in categories" :key="cat.id" class="category-item">
        <!-- 分类标题（点击展开/折叠） -->
        <div class="category-header" @click="toggleCategory(cat.id)">
          <span class="category-arrow" :class="{ expanded: expandedCategories.includes(cat.id) }">
            ▶
          </span>
          <span class="category-name">{{ cat.name }}</span>
          <span class="category-count">{{ getStoriesByCategory(cat.id).length }} 个故事</span>
        </div>

        <!-- 展开后的故事卡片列表 -->
        <div v-if="expandedCategories.includes(cat.id)" class="story-list">
          <div
            v-for="story in getStoriesByCategory(cat.id)"
            :key="story.id"
            class="story-card"
            @click="goToStory(story.id)"
          >
            <!-- 缩略图 -->
            <div class="story-thumb">
              <img v-if="story.segments[0].image" :src="story.segments[0].image" :alt="story.title" />
              <div v-else class="thumb-placeholder">插图占位</div>
            </div>

            <!-- 标题与状态 -->
            <div class="story-info">
              <span class="story-title">{{ story.title }}</span>
              <div class="badge-row">
                <span v-if="readStoryIds.includes(story.id)" class="read-badge">已读完</span>
                <span v-if="downloadedIds.includes(story.id)" class="downloaded-badge">已下载</span>
                <span v-if="downloadingStory === story.id" class="downloading-text">下载中 {{ downloadProgress }}%</span>
              </div>
            </div>

            <!-- 右侧操作按钮 -->
            <div class="card-actions">
              <!-- 未下载：显示下载按钮 -->
              <button
                v-if="!downloadedIds.includes(story.id) && downloadingStory !== story.id"
                class="action-icon download-icon"
                @click.stop="downloadStory(story)"
                title="下载"
              >⬇</button>

              <!-- 下载中：显示进度条 -->
              <div v-if="downloadingStory === story.id" class="progress-ring" title="下载中">
                <span class="progress-text">{{ downloadProgress }}%</span>
              </div>

              <!-- 已下载：显示删除按钮 -->
              <button
                v-if="downloadedIds.includes(story.id)"
                class="action-icon delete-icon"
                @click.stop="confirmDelete(story)"
                title="删除下载"
              >🗑</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重置确认弹窗 -->
    <div v-if="showResetConfirm" class="modal-mask" @click.self="showResetConfirm = false">
      <div class="modal-box">
        <p class="modal-text">确定要清空所有进度吗？</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showResetConfirm = false">取消</button>
          <button class="modal-btn confirm" @click="resetProgress">确定</button>
        </div>
      </div>
    </div>

    <!-- 删除下载确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-mask" @click.self="showDeleteConfirm = false">
      <div class="modal-box">
        <p class="modal-text">确定要删除该故事的下载内容吗？</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showDeleteConfirm = false">取消</button>
          <button class="modal-btn confirm" @click="deleteDownloaded">确定</button>
        </div>
      </div>
    </div>

    <!-- 操作结果提示 -->
    <div v-if="showTip" class="modal-mask" @click.self="showTip = false">
      <div class="modal-box">
        <p class="modal-text" :class="`tip-${tipType}`">{{ tipMessage }}</p>
        <button class="modal-btn confirm" @click="showTip = false">知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { categories, stories } from '../data/stories.js'
import { getReadStoryIds, clearReadStoryIds } from '../utils/storage.js'
import {
  isSupported as isIDBSupported,
  saveStory,
  deleteStory,
  getDownloadedIds
} from '../utils/db.js'

const router = useRouter()
const route = useRoute()

// 默认展开第一个分类，其余折叠
const expandedCategories = ref([categories[0].id])

// 已读完的故事 ID（从 localStorage 读取）
const readStoryIds = ref([])

// 已下载的故事 ID 列表（从 IndexedDB 读取）
const downloadedIds = ref([])

// 正在下载的故事 ID（null 表示无下载任务）
const downloadingStory = ref(null)
const downloadProgress = ref(0)

// 重置确认弹窗
const showResetConfirm = ref(false)

// 删除下载确认弹窗
const showDeleteConfirm = ref(false)
const deleteTargetStory = ref(null)

// 操作结果提示（重置成功/失败）
const showTip = ref(false)
const tipMessage = ref('')
const tipType = ref('info')  // info / success / error

function showTipMessage(message, type = 'info') {
  tipMessage.value = message
  tipType.value = type
  showTip.value = true
}

function refreshReadList() {
  readStoryIds.value = getReadStoryIds()
}

// 刷新已下载列表
async function refreshDownloadedIds() {
  if (!isIDBSupported()) return
  try {
    downloadedIds.value = await getDownloadedIds()
  } catch (e) {
    console.warn('读取已下载列表失败：', e)
  }
}

// 页面加载时读取已读列表 + 已下载列表
onMounted(() => {
  refreshReadList()
  refreshDownloadedIds()
})

// 路由回到首页时重新读取已读列表和已下载列表
watch(() => route.fullPath, (newPath) => {
  if (newPath === '/' || newPath === '/#/') {
    refreshReadList()
    refreshDownloadedIds()
  }
})

function toggleCategory(catId) {
  const index = expandedCategories.value.indexOf(catId)
  if (index === -1) {
    expandedCategories.value.push(catId)
  } else {
    expandedCategories.value.splice(index, 1)
  }
}

function getStoriesByCategory(catId) {
  return stories.filter(s => s.category === catId)
}

function goToStory(id) {
  router.push(`/story/${id}`)
}

function resetProgress() {
  const ok = clearReadStoryIds()
  readStoryIds.value = []
  showResetConfirm.value = false
  if (ok) {
    showTipMessage('进度已清空', 'success')
  } else {
    showTipMessage('重置失败，请检查浏览器存储设置', 'error')
  }
}

// 下载故事
async function downloadStory(story) {
  if (!isIDBSupported()) {
    showTipMessage('当前浏览器不支持离线下载功能', 'error')
    return
  }

  downloadingStory.value = story.id
  downloadProgress.value = 0

  try {
    // 深拷贝 story，避免污染内存中的原始数据
    const storyToSave = JSON.parse(JSON.stringify(story))
    const segments = storyToSave.segments
    const totalSegments = segments.length

    // 逐段处理：将图片和音频转成 base64 存入 IndexedDB（离线可用）
    for (let i = 0; i < totalSegments; i++) {
      const seg = segments[i]

      // 如果插图不是 base64（相对路径或 http URL），尝试 fetch 转 base64 存储
      if (seg.image && !seg.image.startsWith('data:')) {
        try {
          const res = await fetch(seg.image)
          const blob = await res.blob()
          seg.image = await blobToBase64(blob)
        } catch (e) {
          console.warn(`图片下载失败[${seg.image}]：`, e)
          // 图片下载失败不中断，用原 URL 降级
        }
      }

      // 如果音频不是 base64，尝试 fetch 转 base64 存储
      if (seg.audio && !seg.audio.startsWith('data:')) {
        try {
          const res = await fetch(seg.audio)
          const blob = await res.blob()
          seg.audio = await blobToBase64(blob)
        } catch (e) {
          console.warn(`音频下载失败[${seg.audio}]：`, e)
          // 音频下载失败不中断，用原 URL 降级（在线时仍可播放）
        }
      }

      // 更新进度
      downloadProgress.value = Math.round(((i + 1) / totalSegments) * 100)
    }

    // 存入 IndexedDB
    await saveStory(storyToSave)
    await refreshDownloadedIds()
    showTipMessage('下载完成', 'success')
  } catch (e) {
    console.error('下载失败：', e)
    showTipMessage('下载失败，请重试', 'error')
  } finally {
    downloadingStory.value = null
    downloadProgress.value = 0
  }
}

// 图片 blob 转 base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 确认删除下载
function confirmDelete(story) {
  deleteTargetStory.value = story
  showDeleteConfirm.value = true
}

// 执行删除
async function deleteDownloaded() {
  const story = deleteTargetStory.value
  if (!story) return
  showDeleteConfirm.value = false
  try {
    await deleteStory(story.id)
    await refreshDownloadedIds()
    showTipMessage('已删除下载内容', 'success')
  } catch (e) {
    console.error('删除失败：', e)
    showTipMessage('删除失败，请重试', 'error')
  } finally {
    deleteTargetStory.value = null
  }
}
</script>

<style scoped>
.home-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  background-color: #fafafa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 16px;
}

.title {
  font-size: 22px;
  color: #333;
}

.reset-btn {
  font-size: 13px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #666;
  cursor: pointer;
}

.reset-btn:active {
  background: #f0f0f0;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-item {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.category-header {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  user-select: none;
}

.category-arrow {
  display: inline-block;
  font-size: 12px;
  color: #999;
  margin-right: 10px;
  transition: transform 0.2s;
}

.category-arrow.expanded {
  transform: rotate(90deg);
}

.category-name {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.category-count {
  font-size: 13px;
  color: #999;
}

.story-list {
  display: flex;
  flex-direction: column;
  padding: 0 12px 12px 12px;
  gap: 10px;
}

.story-card {
  display: flex;
  align-items: center;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  gap: 12px;
}

.story-card:active {
  background: #f0f0f0;
}

.story-thumb {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e8e8e8;
}

.story-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #aaa;
}

.story-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.story-title {
  font-size: 15px;
  color: #333;
  line-height: 1.4;
}

.read-badge {
  display: inline-block;
  width: fit-content;
  font-size: 11px;
  padding: 2px 8px;
  background: #4caf50;
  color: #fff;
  border-radius: 10px;
}

.downloaded-badge {
  display: inline-block;
  width: fit-content;
  font-size: 11px;
  padding: 2px 8px;
  background: #2196f3;
  color: #fff;
  border-radius: 10px;
}

.badge-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.downloading-text {
  font-size: 11px;
  color: #2196f3;
}

/* 卡片右侧操作按钮 */
.card-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
}

.action-icon {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.download-icon {
  color: #2196f3;
}

.delete-icon {
  color: #999;
}

.action-icon:active {
  opacity: 0.6;
}

.progress-ring {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-text {
  font-size: 10px;
  color: #2196f3;
  font-weight: 600;
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

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
}

.modal-btn.cancel {
  background: #f0f0f0;
  color: #666;
}

.modal-btn.confirm {
  background: #ff4d4f;
  color: #fff;
}

/* 操作提示颜色 */
.tip-success {
  color: #4caf50;
}

.tip-error {
  color: #ff4d4f;
}
</style>
