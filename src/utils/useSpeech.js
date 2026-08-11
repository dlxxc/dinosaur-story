// 语音朗读工具（基于 <audio> 元素播放 Kokoro 预生成 WAV）
// 功能：按段落顺序播放音频，支持暂停/继续/停止/语速调节
// 高亮：通过回调通知"当前读到第几段"，由调用方负责整段高亮
//
// 与旧版（Web Speech API）的差异：
// 1. 高亮粒度从"句"变为"段"（WAV 按段生成）
// 2. 语速通过 playbackRate 调节，会同时改变音调（慢速偏低沉，快速偏尖锐）
// 3. 不再依赖浏览器 SpeechSynthesis 支持，全平台兼容

// 语速档位映射（playbackRate：1 为正常语速）
const SPEED_MAP = {
  slow: 0.8,
  medium: 1.0,
  fast: 1.25
}

export function useSpeech() {
  // 单个 <audio> 元素复用，避免频繁创建
  let audioEl = null
  // 段落列表（含 audio 路径或 base64）
  let segmentList = []
  // 当前播放到的段落索引
  let currentIndex = 0
  let isPaused = false
  let speed = 'medium'

  // 回调函数（由调用方设置）
  let onHighlight = null    // (segmentIndex) => void  高亮某段
  let onEnd = null          // () => void  朗读结束
  let onStart = null        // () => void  朗读开始
  let onPause = null        // () => void  暂停
  let onResume = null       // () => void  继续

  // 兼容性：<audio> 元素全平台支持，无需特别检测
  function isSupported() {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }

  function setCallbacks({ highlight, end, start, pause, resume } = {}) {
    onHighlight = highlight
    onEnd = end
    onStart = start
    onPause = pause
    onResume = resume
  }

  function setSpeed(speedId) {
    speed = speedId
    // 实时应用到当前播放元素
    if (audioEl) {
      audioEl.playbackRate = SPEED_MAP[speedId] || 1.0
    }
  }

  // 创建或复用 <audio> 元素，绑定事件
  function ensureAudioEl() {
    if (audioEl) return audioEl
    audioEl = new Audio()
    // 播放结束 → 自动播放下一段
    audioEl.addEventListener('ended', () => {
      if (currentIndex < segmentList.length - 1) {
        playFrom(currentIndex + 1)
      } else {
        // 全部读完
        isPaused = false
        if (onEnd) onEnd()
      }
    })
    // 加载或播放错误 → 提示并停止
    audioEl.addEventListener('error', (e) => {
      console.error('音频播放错误:', e, '当前段:', currentIndex, '源:', audioEl.src)
      isPaused = false
      if (onEnd) onEnd()
    })
    return audioEl
  }

  // 内部：从指定段落开始播放
  function playFrom(index) {
    if (!isSupported()) {
      throw new Error('当前浏览器不支持音频播放功能')
    }
    if (index < 0 || index >= segmentList.length) {
      if (onEnd) onEnd()
      return
    }
    currentIndex = index
    const seg = segmentList[index]
    if (!seg.audio) {
      console.warn(`第 ${index + 1} 段缺少 audio 字段，跳过`)
      // 跳过无音频的段落
      if (index < segmentList.length - 1) {
        playFrom(index + 1)
      } else {
        if (onEnd) onEnd()
      }
      return
    }
    const el = ensureAudioEl()
    el.src = seg.audio
    el.playbackRate = SPEED_MAP[speed] || 1.0
    // 高亮当前段
    if (onHighlight) onHighlight(index)
    // 调用 play()（返回 Promise，忽略错误由 error 事件处理）
    const playPromise = el.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(err => {
        console.warn('播放被中断或失败:', err)
      })
    }
  }

  // 内部停止（不触发回调）
  function stopInternal() {
    if (audioEl) {
      audioEl.pause()
      audioEl.removeAttribute('src')
      audioEl.load()  // 释放资源
    }
    isPaused = false
  }

  // 开始朗读（从头）
  function start(segments) {
    segmentList = segments || []
    if (segmentList.length === 0) return
    stopInternal()
    isPaused = false
    if (onStart) onStart()
    playFrom(0)
  }

  // 暂停
  function pause() {
    if (!audioEl || isPaused) return
    audioEl.pause()
    isPaused = true
    if (onPause) onPause()
  }

  // 继续
  function resume() {
    if (!audioEl || !isPaused) return
    isPaused = false
    const playPromise = audioEl.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(err => {
        console.warn('继续播放失败:', err)
      })
    }
    if (onResume) onResume()
  }

  // 停止（从头开始才算下一次播放）
  function stop() {
    stopInternal()
  }

  // 再听一遍（从头朗读当前故事）
  function replay(segments) {
    start(segments)
  }

  function getIsPaused() {
    return isPaused
  }

  function getIsPlaying() {
    return audioEl !== null && !isPaused && audioEl.src !== ''
  }

  return {
    isSupported,
    setCallbacks,
    setSpeed,
    start,
    pause,
    resume,
    stop,
    replay,
    getIsPaused,
    getIsPlaying
  }
}
