<template>
  <section 
    data-test="hero-section"
    role="banner"
    class="relative bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden"
  >
    <div 
      data-test="hero-container"
      class="px-4 py-12 sm:px-6 lg:px-8 lg:py-24"
    >
      <div 
        data-test="hero-content"
        class="max-w-7xl mx-auto"
      >
        <div class="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <!-- Text Content -->
          <div class="mb-8 lg:mb-0">
            <h1 class="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Transform Your Business with AI
            </h1>
            
            <p 
              data-test="tagline"
              class="mt-6 text-xl text-gray-600 sm:text-2xl"
            >
              AI-powered consulting solutions that drive innovation and growth for organizations of all sizes.
            </p>
            
            <!-- Value Propositions -->
            <div class="mt-8 space-y-4">
              <div 
                v-for="prop in valueProps" 
                :key="prop.id"
                data-test="value-prop"
                class="flex items-start"
              >
                <svg class="h-6 w-6 text-green-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="ml-3 text-gray-700">{{ prop.text }}</span>
              </div>
            </div>
            
            <!-- CTA Buttons -->
            <div class="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                data-test="cta-primary"
                @click="handleStartChat"
                :disabled="isLoading"
                :class="[
                  'px-8 py-3 text-base font-medium rounded-md text-white',
                  'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2',
                  'focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200',
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                ]"
                aria-label="Start a free AI-powered consultation"
              >
                <span v-if="!isLoading">Start Free Consultation</span>
                <span v-else class="flex items-center">
                  <span data-test="loading" class="mr-2">Starting...</span>
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </span>
              </button>
              
              <button
                data-test="cta-secondary"
                @click="scrollToServices"
                class="px-8 py-3 text-base font-medium rounded-md text-indigo-600 
                       bg-white hover:bg-gray-50 border border-indigo-600 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-indigo-500 transition-all duration-200"
                aria-label="Learn more about our services"
              >
                Learn More
              </button>
            </div>
          </div>
          
          <!-- Hero Visual -->
          <div 
            data-test="hero-visual"
            class="relative lg:mt-0"
          >
            <svg
              class="w-full h-auto"
              viewBox="0 0 600 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Abstract tech visualization -->
              <rect x="50" y="50" width="100" height="100" rx="10" fill="#6366F1" opacity="0.2"/>
              <rect x="170" y="80" width="120" height="120" rx="10" fill="#6366F1" opacity="0.3"/>
              <rect x="310" y="60" width="90" height="90" rx="10" fill="#6366F1" opacity="0.2"/>
              <rect x="100" y="170" width="110" height="110" rx="10" fill="#6366F1" opacity="0.25"/>
              <rect x="230" y="220" width="140" height="140" rx="10" fill="#6366F1" opacity="0.15"/>
              
              <!-- Connecting lines -->
              <line x1="100" y1="100" x2="230" y2="140" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
              <line x1="230" y1="140" x2="355" y2="105" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
              <line x1="155" y1="225" x2="300" y2="290" stroke="#6366F1" stroke-width="2" opacity="0.4"/>
              
              <!-- Central AI icon -->
              <circle cx="300" cy="200" r="50" fill="#6366F1" opacity="0.9"/>
              <text x="300" y="210" text-anchor="middle" fill="white" font-size="24" font-weight="bold">AI</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

// Emit events
const emit = defineEmits(['start-chat']);

// State
const isLoading = ref(false);

// Value propositions data
const valueProps = [
  { id: 1, text: 'Guaranteed ROI within 90 days' },
  { id: 2, text: 'Expert consultants with AI augmentation' },
  { id: 3, text: 'Cutting-edge AI solutions tailored to your needs' },
  { id: 4, text: 'Free initial consultation and assessment' }
];

// Methods
const handleStartChat = async () => {
  isLoading.value = true;
  
  // Emit event to parent
  emit('start-chat');
  
  // Simulate async operation
  setTimeout(() => {
    isLoading.value = false;
  }, 2000);
};

const scrollToServices = () => {
  const servicesSection = document.getElementById('services');
  if (servicesSection) {
    servicesSection.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>