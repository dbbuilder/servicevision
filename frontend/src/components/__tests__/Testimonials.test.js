import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Testimonials from '../Testimonials.vue';

describe('Testimonials Component', () => {
  const mockTestimonials = [
    {
      id: 1,
      name: 'John Smith',
      role: 'CEO',
      company: 'Tech Innovations Inc.',
      content: 'ServiceVision transformed our AI strategy. Their expertise helped us reduce costs by 40% while improving efficiency.',
      rating: 5,
      image: '/images/testimonials/john-smith.jpg'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      role: 'Director of Operations',
      company: 'Global Nonprofits United',
      content: 'The team at ServiceVision understood our nonprofit needs perfectly. They delivered solutions that amplified our impact.',
      rating: 5,
      image: '/images/testimonials/sarah-johnson.jpg'
    },
    {
      id: 3,
      name: 'Michael Chen',
      role: 'CTO',
      company: 'StartupHub',
      content: 'Outstanding AI consulting services. They helped us build a scalable ML pipeline that grew with our business.',
      rating: 5,
      image: null // Test missing image scenario
    }
  ];

  let wrapper;

  beforeEach(() => {
    wrapper = null;
  });

  describe('Component Rendering', () => {
    test('renders testimonials section with correct structure', () => {
      wrapper = mount(Testimonials);
      
      expect(wrapper.find('[data-test="testimonials-section"]').exists()).toBe(true);
      expect(wrapper.find('[role="region"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Client testimonials"]').exists()).toBe(true);
    });

    test('displays section heading and subheading', () => {
      wrapper = mount(Testimonials);
      
      const heading = wrapper.find('[data-test="section-heading"]');
      const subheading = wrapper.find('[data-test="section-subheading"]');
      
      expect(heading.exists()).toBe(true);
      expect(heading.text()).toBe('What Our Clients Say');
      expect(subheading.exists()).toBe(true);
      expect(subheading.text()).toContain('success stories');
    });

    test('renders testimonial cards when testimonials are provided', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials
        }
      });
      
      const cards = wrapper.findAll('[data-test="testimonial-card"]');
      expect(cards).toHaveLength(3);
    });

    test('displays empty state when no testimonials', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: []
        }
      });
      
      expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="testimonial-card"]').exists()).toBe(false);
    });
  });

  describe('Testimonial Card Content', () => {
    test('displays all testimonial information correctly', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: [mockTestimonials[0]]
        }
      });
      
      const card = wrapper.find('[data-test="testimonial-card"]');
      
      expect(card.find('[data-test="testimonial-content"]').text()).toBe(mockTestimonials[0].content);
      expect(card.find('[data-test="testimonial-name"]').text()).toBe(mockTestimonials[0].name);
      expect(card.find('[data-test="testimonial-role"]').text()).toBe(`${mockTestimonials[0].role} at ${mockTestimonials[0].company}`);
    });

    test('displays rating stars correctly', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials
        }
      });
      
      const firstCard = wrapper.findAll('[data-test="testimonial-card"]')[0];
      const stars = firstCard.findAll('[data-test="rating-star"]');
      
      expect(stars).toHaveLength(5);
      stars.forEach(star => {
        expect(star.classes()).toContain('text-yellow-400');
      });
    });

    test('handles missing profile image gracefully', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: [mockTestimonials[2]]
        }
      });
      
      const avatar = wrapper.find('[data-test="testimonial-avatar"]');
      expect(avatar.exists()).toBe(true);
      
      // Should show initials when no image
      const initials = wrapper.find('[data-test="avatar-initials"]');
      expect(initials.exists()).toBe(true);
      expect(initials.text()).toBe('MC'); // Michael Chen
    });

    test('displays profile image when available', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: [mockTestimonials[0]]
        }
      });
      
      const avatarImg = wrapper.find('[data-test="avatar-image"]');
      expect(avatarImg.exists()).toBe(true);
      expect(avatarImg.attributes('src')).toBe(mockTestimonials[0].image);
      expect(avatarImg.attributes('alt')).toBe(`${mockTestimonials[0].name} profile`);
    });
  });

  describe('Props and Customization', () => {
    test('accepts custom heading and subheading', () => {
      wrapper = mount(Testimonials, {
        props: {
          heading: 'Customer Reviews',
          subheading: 'See what people are saying',
          testimonials: mockTestimonials
        }
      });
      
      expect(wrapper.find('[data-test="section-heading"]').text()).toBe('Customer Reviews');
      expect(wrapper.find('[data-test="section-subheading"]').text()).toBe('See what people are saying');
    });

    test('limits displayed testimonials with maxDisplay prop', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials,
          maxDisplay: 2
        }
      });
      
      const cards = wrapper.findAll('[data-test="testimonial-card"]');
      expect(cards).toHaveLength(2);
    });

    test('applies custom CSS classes', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials,
          sectionClass: 'custom-section-class',
          cardClass: 'custom-card-class'
        }
      });
      
      expect(wrapper.find('[data-test="testimonials-section"]').classes()).toContain('custom-section-class');
      expect(wrapper.find('[data-test="testimonial-card"]').classes()).toContain('custom-card-class');
    });

    test('shows view all button when showViewAll is true and has more testimonials', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials,
          maxDisplay: 2,
          showViewAll: true
        }
      });
      
      const viewAllBtn = wrapper.find('[data-test="view-all-button"]');
      expect(viewAllBtn.exists()).toBe(true);
      expect(viewAllBtn.text()).toBe('View All Testimonials');
    });

    test('does not show view all button when all testimonials are displayed', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials.slice(0, 2),
          maxDisplay: 2,
          showViewAll: true
        }
      });
      
      expect(wrapper.find('[data-test="view-all-button"]').exists()).toBe(false);
    });
  });

  describe('Interactions', () => {
    test('emits view-all event when button is clicked', async () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials,
          maxDisplay: 2,
          showViewAll: true
        }
      });
      
      await wrapper.find('[data-test="view-all-button"]').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('view-all');
      expect(wrapper.emitted('view-all')).toHaveLength(1);
    });

    test('emits testimonial-click event when card is clicked', async () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials
        }
      });
      
      await wrapper.find('[data-test="testimonial-card"]').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('testimonial-click');
      expect(wrapper.emitted('testimonial-click')[0][0]).toEqual(mockTestimonials[0]);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials
        }
      });
      
      const section = wrapper.find('[data-test="testimonials-section"]');
      expect(section.attributes('role')).toBe('region');
      expect(section.attributes('aria-label')).toBe('Client testimonials');
      
      const cards = wrapper.findAll('[data-test="testimonial-card"]');
      cards.forEach(card => {
        expect(card.attributes('role')).toBe('article');
        expect(card.attributes('aria-label')).toContain('Testimonial from');
      });
    });

    test('rating stars have proper accessibility text', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: [mockTestimonials[0]]
        }
      });
      
      const rating = wrapper.find('[data-test="testimonial-rating"]');
      expect(rating.attributes('aria-label')).toBe('5 out of 5 stars');
    });
  });

  describe('Loading and Error States', () => {
    test('shows loading state when isLoading prop is true', () => {
      wrapper = mount(Testimonials, {
        props: {
          isLoading: true
        }
      });
      
      expect(wrapper.find('[data-test="loading-state"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="testimonial-card"]').exists()).toBe(false);
    });

    test('shows error state when hasError prop is true', () => {
      wrapper = mount(Testimonials, {
        props: {
          hasError: true,
          errorMessage: 'Failed to load testimonials'
        }
      });
      
      const errorState = wrapper.find('[data-test="error-state"]');
      expect(errorState.exists()).toBe(true);
      expect(errorState.text()).toContain('Failed to load testimonials');
    });
  });

  describe('Responsive Design', () => {
    test('applies responsive grid classes', () => {
      wrapper = mount(Testimonials, {
        props: {
          testimonials: mockTestimonials
        }
      });
      
      const grid = wrapper.find('[data-test="testimonials-grid"]');
      expect(grid.classes()).toContain('grid');
      expect(grid.classes()).toContain('grid-cols-1');
      expect(grid.classes()).toContain('md:grid-cols-2');
      expect(grid.classes()).toContain('lg:grid-cols-3');
    });
  });
});