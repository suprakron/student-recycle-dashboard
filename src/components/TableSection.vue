<!-- src/components/TableSection.vue -->
<template>
  <section class="table-section">
    <h3>{{ title }}</h3>
    <div class="table-wrapper">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps(['title'])
</script>

<style scoped>
.table-section {
  margin-bottom: 2rem;
}
</style>
