<template>
  <div class="home-page">
    <!-- Navigation Header -->
    <NavigationHeader />

    <!-- Hero Section -->
    <section class="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white">
      <div class="absolute inset-0 bg-black opacity-10"></div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            ServiceVision
          </h1>
          <p class="text-xl md:text-2xl mb-8 text-primary-100">
            Integrating Business Acumen with Technological Excellence for a Better World
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button @click="openChat" class="btn-primary bg-white text-primary-900 hover:bg-gray-100">
              Start AI Consultation
            </button>
            <a href="#services" class="btn-secondary">
              Explore Our Services
            </a>
          </div>
        </div>
      </div>
      
      <!-- Wave SVG -->
      <div class="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="white"/>
        </svg>
      </div>
    </section>
    <!-- Dual Mission Section -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            A Unique Dual Mission
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            We believe exceptional business strategy and innovative technology are powerful forces for positive change
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-8">
          <!-- For-Profit Division -->
          <div class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 ml-4">ServiceVision.net</h3>
            </div>
            <p class="text-gray-600 mb-4">
              Our for-profit consulting arm delivers measurable value through business strategy, software development, analytics, and system architecture.
            </p>
            <ul class="space-y-2 text-gray-600">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                MBA-level strategic guidance
              </li>              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Cutting-edge technology solutions
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-primary-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Measurable business impact
              </li>
            </ul>
          </div>
          
          <!-- Nonprofit Division -->
          <div class="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 ml-4">ServiceVision.org</h3>
            </div>
            <p class="text-gray-600 mb-4">
              Our nonprofit division provides pro bono and reduced-cost consulting for community-focused organizations serving underserved populations.
            </p>
            <ul class="space-y-2 text-gray-600">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-secondary-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Community impact focus
              </li>              <li class="flex items-start">
                <svg class="w-5 h-5 text-secondary-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Pro bono services
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-secondary-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Capacity building support
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Consulting Services
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive solutions across business strategy, technology, and compliance
          </p>
        </div>
        
        <ServiceGrid />
      </div>
    </section>

    <!-- Testimonials Section -->
    <Testimonials 
      :testimonials="testimonials"
      :max-display="3"
      :show-view-all="true"
      @view-all="handleViewAllTestimonials"
      @testimonial-click="handleTestimonialClick"
    />

    <!-- CTA Section -->
    <section class="py-20 bg-primary-900 text-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-6">
          Ready to Transform Your Organization?
        </h2>
        <p class="text-xl mb-8 text-primary-100">
          Let our AI consultant help identify your needs and create a custom solution
        </p>
        <button @click="openChat" class="btn-primary bg-white text-primary-900 hover:bg-gray-100">
          Start Your Free Consultation
        </button>
      </div>
    </section>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script setup>
import { useChatStore } from '@/stores/chat'
import NavigationHeader from '@/components/NavigationHeader.vue'
import ServiceGrid from '@/components/ServiceGrid.vue'
import Testimonials from '@/components/Testimonials.vue'
import AppFooter from '@/components/AppFooter.vue'
import { ref } from 'vue'

const chatStore = useChatStore()

// Mock testimonials data - in production, this would come from an API
const testimonials = ref([
  {
    id: 1,
    name: 'John Smith',
    role: 'CEO',
    company: 'Tech Innovations Inc.',
    content: 'ServiceVision transformed our AI strategy. Their expertise helped us reduce costs by 40% while improving efficiency.',
    rating: 5,
    image: null
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    role: 'Director of Operations',
    company: 'Global Nonprofits United',
    content: 'The team at ServiceVision understood our nonprofit needs perfectly. They delivered solutions that amplified our impact.',
    rating: 5,
    image: null
  },
  {
    id: 3,
    name: 'Michael Chen',
    role: 'CTO',
    company: 'StartupHub',
    content: 'Outstanding AI consulting services. They helped us build a scalable ML pipeline that grew with our business.',
    rating: 5,
    image: null
  },
  {
    id: 4,
    name: 'Emily Rodriguez',
    role: 'VP of Technology',
    company: 'Healthcare Solutions Co.',
    content: 'ServiceVision\'s dual mission approach aligned perfectly with our values. They delivered enterprise-grade solutions while supporting our community initiatives.',
    rating: 5,
    image: null
  },
  {
    id: 5,
    name: 'David Thompson',
    role: 'Executive Director',
    company: 'Community Development Fund',
    content: 'As a nonprofit, we were thrilled to work with ServiceVision.org. Their pro bono consulting helped us modernize our entire data infrastructure.',
    rating: 5,
    image: null
  }
])

function openChat() {
  chatStore.toggleChat()
}

function handleViewAllTestimonials() {
  // In a real app, this might navigate to a dedicated testimonials page
  // For now, we'll just open the chat
  openChat()
}

function handleTestimonialClick(testimonial) {
  // Could be used to show more details or open chat with context
  console.log('Testimonial clicked:', testimonial)
  openChat()
}
</script>