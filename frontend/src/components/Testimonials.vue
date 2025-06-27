<template>
  <section
    data-test="testimonials-section"
    role="region"
    aria-label="Client testimonials"
    :class="['py-12 bg-white', sectionClass]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="text-center mb-12">
        <h2
          data-test="section-heading"
          class="text-3xl font-extrabold text-gray-900 sm:text-4xl"
        >
          {{ heading }}
        </h2>
        <p
          data-test="section-subheading"
          class="mt-4 text-xl text-gray-600"
        >
          {{ subheading }}
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        data-test="loading-state"
        class="flex justify-center items-center py-12"
      >
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="hasError"
        data-test="error-state"
        class="text-center py-12"
      >
        <p class="text-red-600">{{ errorMessage || 'Failed to load testimonials' }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!displayedTestimonials.length"
        data-test="empty-state"
        class="text-center py-12"
      >
        <p class="text-gray-600">No testimonials available at this time.</p>
      </div>

      <!-- Testimonials Grid -->
      <div
        v-else
        data-test="testimonials-grid"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <article
          v-for="testimonial in displayedTestimonials"
          :key="testimonial.id"
          data-test="testimonial-card"
          role="article"
          :aria-label="`Testimonial from ${testimonial.name}`"
          @click="handleTestimonialClick(testimonial)"
          :class="[
            'bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 cursor-pointer',
            cardClass
          ]"
        >
          <!-- Rating Stars -->
          <div
            data-test="testimonial-rating"
            :aria-label="`${testimonial.rating} out of 5 stars`"
            class="flex mb-4"
          >
            <svg
              v-for="star in 5"
              :key="star"
              data-test="rating-star"
              :class="[
                'h-5 w-5',
                star <= testimonial.rating ? 'text-yellow-400' : 'text-gray-300'
              ]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          <!-- Testimonial Content -->
          <p
            data-test="testimonial-content"
            class="text-gray-700 mb-6 italic"
          >
            {{ testimonial.content }}
          </p>

          <!-- Author Info -->
          <div class="flex items-center">
            <!-- Avatar -->
            <div
              data-test="testimonial-avatar"
              class="flex-shrink-0 mr-4"
            >
              <img
                v-if="testimonial.image"
                data-test="avatar-image"
                :src="testimonial.image"
                :alt="`${testimonial.name} profile`"
                class="h-12 w-12 rounded-full object-cover"
              />
              <div
                v-else
                data-test="avatar-initials"
                class="h-12 w-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold"
              >
                {{ getInitials(testimonial.name) }}
              </div>
            </div>

            <!-- Name and Role -->
            <div>
              <h3
                data-test="testimonial-name"
                class="text-sm font-semibold text-gray-900"
              >
                {{ testimonial.name }}
              </h3>
              <p
                data-test="testimonial-role"
                class="text-sm text-gray-600"
              >
                {{ testimonial.role }} at {{ testimonial.company }}
              </p>
            </div>
          </div>
        </article>
      </div>

      <!-- View All Button -->
      <div
        v-if="showViewAll && hasMoreTestimonials"
        class="text-center mt-8"
      >
        <button
          data-test="view-all-button"
          @click="handleViewAll"
          class="inline-flex items-center px-6 py-3 border border-primary-600 text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
        >
          View All Testimonials
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  testimonials: {
    type: Array,
    default: () => []
  },
  heading: {
    type: String,
    default: 'What Our Clients Say'
  },
  subheading: {
    type: String,
    default: 'Read success stories from businesses we\'ve helped transform'
  },
  maxDisplay: {
    type: Number,
    default: null
  },
  showViewAll: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  hasError: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  sectionClass: {
    type: String,
    default: ''
  },
  cardClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['view-all', 'testimonial-click']);

// Computed properties
const displayedTestimonials = computed(() => {
  if (!props.testimonials || props.testimonials.length === 0) {
    return [];
  }
  
  if (props.maxDisplay && props.maxDisplay > 0) {
    return props.testimonials.slice(0, props.maxDisplay);
  }
  
  return props.testimonials;
});

const hasMoreTestimonials = computed(() => {
  return props.maxDisplay && 
         props.testimonials.length > props.maxDisplay;
});

// Methods
const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const handleViewAll = () => {
  emit('view-all');
};

const handleTestimonialClick = (testimonial) => {
  emit('testimonial-click', testimonial);
};
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>