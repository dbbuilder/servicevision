<template>
  <div class="services-page">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold mb-6">Our Services</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="service-card p-6 bg-white rounded-lg shadow-md">
          <h3 class="text-xl font-semibold mb-2">Business Strategy</h3>
          <p>Transform your business with strategic planning and execution.</p>
        </div>
        <div class="service-card p-6 bg-white rounded-lg shadow-md">
          <h3 class="text-xl font-semibold mb-2">Technology Solutions</h3>
          <p>Leverage cutting-edge technology to drive innovation.</p>
        </div>
        <div class="service-card p-6 bg-white rounded-lg shadow-md">
          <h3 class="text-xl font-semibold mb-2">Digital Transformation</h3>
          <p>Modernize your operations for the digital age.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Minimal services page implementation
</script>

<style scoped>
.services-page {
  min-height: calc(100vh - 200px);
}
</style>