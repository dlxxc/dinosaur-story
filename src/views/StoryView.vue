<template>
  <div class="story-view">
    <h1>故事详情页</h1>
    <p>故事 ID: {{ route.params.id }}</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.story-view {
  padding: 20px;
  text-align: center;
}
</style>
