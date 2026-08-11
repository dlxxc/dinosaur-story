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
              <img v-if="story.segments[0].image" :src="resolveAsset(story.segments[0].image)" :alt="story.title" loading="lazy" decoding="async" />
              <div v-else class="thumb-placeholder">插图占位</div>
            </div>

            <!-- 标题与状态 -->
            <div class="story-info">
              <span class="story-title">{{ story.title }}</span>
              <div class="badge-row">
                <span v-if="readStoryIds.includes(story.id)" class="read-badge">已读完</span>
              </div>
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

const router = useRouter()
const route = useRoute()

// 拼接 Vite base 路径（dev: '/' / prod: '/dinosaur-story/'）
const BASE_URL = import.meta.env.BASE_URL
function resolveAsset(path) {
  return BASE_URL + path.replace(/^\//, '')
}

// 默认展开第一个分类，其余折叠
const expandedCategories = ref([categories[0].id])

// 已读完的故事 ID（从 localStorage 读取）
const readStoryIds = ref([])

// 重置确认弹窗
const showResetConfirm = ref(false)

// 操作结果提示
const showTip = ref(false)
const tipMessage = ref('')
const tipType = ref('info')

function showTipMessage(message, type = 'info') {
  tipMessage.value = message
  tipType.value = type
  showTip.value = true
}

function refreshReadList() {
  readStoryIds.value = getReadStoryIds()
}

// 页面加载时读取已读列表
onMounted(() => {
  refreshReadList()
})

// 路由回到首页时重新读取已读列表
watch(() => route.fullPath, (newPath) => {
  if (newPath === '/' || newPath === '/#/') {
    refreshReadList()
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

.badge-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
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
  background: #4caf50;
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
