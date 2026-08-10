// 语音朗读工具（基于浏览器 Web Speech API）
// 功能：按句号/问号/感叹号断句，逐句朗读，支持暂停/继续/停止/语速调节
// 高亮：通过回调通知"当前读到第几句"，由调用方负责 UI 高亮

// 语速档位映射（rate 范围 0.1~10，1 为正常语速）
const SPEED_MAP = {
  slow: 0.7,
  medium: 1,
  fast: 1.3
}

// 按句号/问号/感叹号断句（保留标点）
function splitIntoSentences(text) {
  if (!text) return []
  // 匹配以。！？.!?结尾的句子，保留标点
  const matches = text.match(/[^。！？.!?]+[。！？.!?]+/g)
  if (matches && matches.length > 0) return matches
  // 没有匹配到标点，整段作为一句
  return [text]
}

// 把多段故事内容拆成"句子列表"，每句记录所属段落索引
// 返回：[{ sentence, segmentIndex, sentenceIndex }, ...]
function buildSentenceList(segments) {
  const list = []
  segments.forEach((seg, segIndex) => {
    const sentences = splitIntoSentences(seg.text)
    sentences.forEach((sentence, senIndex) => {
      list.push({
        sentence,
        segmentIndex: segIndex,
        sentenceIndex: senIndex
      })
    })
  })
  return list
}

export function useSpeech() {
  let utterance = null
  let sentenceList = []
  let currentIndex = 0
  let isPaused = false
  let speed = 'medium'

  // 回调函数（由调用方设置）
  let onHighlight = null    // (segmentIndex, sentenceIndex) => void  高亮某段某句
  let onEnd = null          // () => void  朗读结束
  let onStart = null        // () => void  朗读开始
  let onPause = null        // () => void  暂停
  let onResume = null       // () => void  继续

  // 检查浏览器是否支持语音合成
  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
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
    // 如果正在朗读，需要重新启动以应用新语速
    if (utterance && !isPaused) {
      const wasPlaying = !isPaused
      stopInternal()
      if (wasPlaying) {
        playFrom(currentIndex)
      }
    }
  }

  // 内部：从指定句子开始朗读
  function playFrom(index) {
    if (!isSupported()) {
      throw new Error('当前浏览器不支持语音朗读功能')
    }
    if (index < 0 || index >= sentenceList.length) {
      if (onEnd) onEnd()
      return
    }
    currentIndex = index
    const item = sentenceList[index]
    // 高亮当前句
    if (onHighlight) onHighlight(item.segmentIndex, item.sentenceIndex)

    utterance = new SpeechSynthesisUtterance(item.sentence)
    utterance.lang = 'zh-CN'
    utterance.rate = SPEED_MAP[speed] || 1

    utterance.onend = () => {
      // 朗读完当前句，继续下一句
      if (currentIndex < sentenceList.length - 1) {
        playFrom(currentIndex + 1)
      } else {
        // 全部读完
        isPaused = false
        utterance = null
        if (onEnd) onEnd()
      }
    }

    utterance.onerror = (e) => {
      console.error('语音朗读错误:', e)
      isPaused = false
      utterance = null
      if (onEnd) onEnd()
    }

    window.speechSynthesis.speak(utterance)
  }

  // 内部停止（不触发回调）
  function stopInternal() {
    if (isSupported()) {
      window.speechSynthesis.cancel()
    }
    utterance = null
    isPaused = false
  }

  // 开始朗读（从头）
  function start(segments) {
    sentenceList = buildSentenceList(segments)
    if (sentenceList.length === 0) return
    stopInternal()
    isPaused = false
    if (onStart) onStart()
    playFrom(0)
  }

  // 暂停
  function pause() {
    if (!isSupported() || !utterance) return
    window.speechSynthesis.pause()
    isPaused = true
    if (onPause) onPause()
  }

  // 继续
  function resume() {
    if (!isSupported() || !utterance || !isPaused) return
    window.speechSynthesis.resume()
    isPaused = false
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
    return utterance !== null && !isPaused
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
