<template>
  <section 
    data-test="services-section"
    role="region"
    aria-label="Available services"
    class="py-12 bg-gray-50"
    :id="sectionId"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="text-center mb-12" v-if="heading || subheading">
        <h2 
          v-if="heading"
          data-test="section-heading"
          class="text-3xl font-extrabold text-gray-900 sm:text-4xl"
        >
          {{ heading }}
        </h2>
        <p 
          v-if="subheading"
          data-test="section-subheading"
          class="mt-4 text-xl text-gray-600"
        >
          {{ subheading }}
        </p>
      </div>

      <!-- Services Grid -->
      <div 
        v-if="services.length > 0"
        data-test="services-grid"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <article
          v-for="service in services"
          :key="service.id"
          data-test="service-card"
          role="article"
          @click="handleServiceClick(service)"
          :class="[
            'bg-white border border-gray-200 rounded-lg p-6',
            'hover:shadow-lg transition-all duration-300 cursor-pointer',
            'transform hover:-translate-y-1',
            cardClass
          ]"
        >
          <!-- Service Icon -->
          <div 
            data-test="service-icon"
            :data-icon="service.icon"
            class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4"
          >
            <component 
              :is="getIconComponent(service.icon)" 
              class="w-6 h-6 text-indigo-600"
            />
          </div>

          <!-- Service Title -->
          <h3 
            data-test="service-title"
            class="text-xl font-semibold mb-2 text-gray-900"
          >
            {{ service.title }}
          </h3>

          <!-- Service Description -->
          <p 
            data-test="service-description"
            class="text-gray-600 mb-4"
          >
            {{ service.description }}
          </p>

          <!-- Service Features -->
          <ul class="space-y-2 mb-6">
            <li
              v-for="(feature, index) in service.features"
              :key="index"
              data-test="service-feature"
              class="flex items-start text-sm text-gray-600"
            >
              <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              {{ feature }}
            </li>
          </ul>

          <!-- CTA Button -->
          <button
            data-test="service-cta"
            class="w-full px-4 py-2 text-sm font-medium text-indigo-600 
                   bg-indigo-50 rounded-md hover:bg-indigo-100 
                   focus:outline-none focus:ring-2 focus:ring-offset-2 
                   focus:ring-indigo-500 transition-colors duration-200"
            @click.stop="handleLearnMore(service)"
          >
            Learn More
          </button>
        </article>
      </div>

      <!-- Empty State -->
      <div 
        v-else
        data-test="no-services"
        class="text-center py-12"
      >
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No services available</h3>
        <p class="mt-1 text-sm text-gray-500">Check back later for our service offerings.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
// Props
const props = defineProps({
  services: {
    type: Array,
    default: () => []
  },
  heading: {
    type: String,
    default: ''
  },
  subheading: {
    type: String,
    default: ''
  },
  sectionId: {
    type: String,
    default: 'services'
  },
  cardClass: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['service-selected']);

// Icon components mapping
const iconComponents = {
  strategy: {
    template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>`
  },
  automation: {
    template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
    </svg>`
  },
  analytics: {
    template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>`
  },
  default: {
    template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>`
  }
};

// Methods
const getIconComponent = (iconName) => {
  return iconComponents[iconName] || iconComponents.default;
};

const handleServiceClick = (service) => {
  emit('service-selected', service);
};

const handleLearnMore = (service) => {
  // Additional logic for learn more button
  console.log('Learn more about:', service.title);
};
</script>