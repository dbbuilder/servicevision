import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServiceGrid from '../ServiceGrid.vue';

describe('ServiceGrid Component', () => {
  const mockServices = [
    {
      id: 1,
      title: 'AI Strategy Consulting',
      description: 'Develop comprehensive AI strategies aligned with your business goals',
      icon: 'strategy',
      features: ['AI Roadmap', 'ROI Analysis', 'Risk Assessment']
    },
    {
      id: 2,
      title: 'Process Automation',
      description: 'Automate repetitive tasks and streamline operations',
      icon: 'automation',
      features: ['Workflow Analysis', 'Bot Development', 'Integration']
    },
    {
      id: 3,
      title: 'Data Analytics',
      description: 'Transform data into actionable insights',
      icon: 'analytics',
      features: ['Data Mining', 'Predictive Analytics', 'Dashboards']
    }
  ];

  test('renders all service cards', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const serviceCards = wrapper.findAll('[data-test="service-card"]');
    expect(serviceCards).toHaveLength(3);
  });

  test('displays service title and description', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const firstCard = wrapper.find('[data-test="service-card"]');
    expect(firstCard.find('[data-test="service-title"]').text()).toBe('AI Strategy Consulting');
    expect(firstCard.find('[data-test="service-description"]').text()).toBe('Develop comprehensive AI strategies aligned with your business goals');
  });

  test('displays service features list', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const firstCard = wrapper.find('[data-test="service-card"]');
    const features = firstCard.findAll('[data-test="service-feature"]');
    
    expect(features).toHaveLength(3);
    expect(features[0].text()).toBe('AI Roadmap');
    expect(features[1].text()).toBe('ROI Analysis');
    expect(features[2].text()).toBe('Risk Assessment');
  });

  test('renders appropriate icons for each service', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const cards = wrapper.findAll('[data-test="service-card"]');
    cards.forEach((card, index) => {
      const icon = card.find('[data-test="service-icon"]');
      expect(icon.exists()).toBe(true);
      expect(icon.attributes('data-icon')).toBe(mockServices[index].icon);
    });
  });

  test('handles empty services array gracefully', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: []
      }
    });
    
    expect(wrapper.find('[data-test="no-services"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="no-services"]').text()).toContain('No services available');
  });

  test('emits service-selected event when card is clicked', async () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const firstCard = wrapper.find('[data-test="service-card"]');
    await firstCard.trigger('click');
    
    expect(wrapper.emitted('service-selected')).toBeTruthy();
    expect(wrapper.emitted('service-selected')[0]).toEqual([mockServices[0]]);
  });

  test('applies hover effects on service cards', async () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const firstCard = wrapper.find('[data-test="service-card"]');
    
    // Check for hover-related classes
    expect(firstCard.classes()).toContain('hover:shadow-lg');
    expect(firstCard.classes()).toContain('transition-all');
  });

  test('has responsive grid layout', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const grid = wrapper.find('[data-test="services-grid"]');
    expect(grid.classes()).toContain('grid');
    expect(grid.classes()).toContain('grid-cols-1');
    expect(grid.classes()).toContain('md:grid-cols-2');
    expect(grid.classes()).toContain('lg:grid-cols-3');
  });

  test('includes section heading and description', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices,
        heading: 'Our Services',
        subheading: 'Choose from our comprehensive service offerings'
      }
    });
    
    expect(wrapper.find('[data-test="section-heading"]').text()).toBe('Our Services');
    expect(wrapper.find('[data-test="section-subheading"]').text()).toBe('Choose from our comprehensive service offerings');
  });

  test('shows CTA button on each card', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const firstCard = wrapper.find('[data-test="service-card"]');
    const ctaButton = firstCard.find('[data-test="service-cta"]');
    
    expect(ctaButton.exists()).toBe(true);
    expect(ctaButton.text()).toBe('Learn More');
  });

  test('is accessible with proper ARIA attributes', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices
      }
    });
    
    const section = wrapper.find('[data-test="services-section"]');
    expect(section.attributes('role')).toBe('region');
    expect(section.attributes('aria-label')).toBe('Available services');
    
    const cards = wrapper.findAll('[data-test="service-card"]');
    cards.forEach(card => {
      expect(card.attributes('role')).toBe('article');
    });
  });

  test('supports custom card styling through props', () => {
    const wrapper = mount(ServiceGrid, {
      props: {
        services: mockServices,
        cardClass: 'custom-card-class'
      }
    });
    
    const firstCard = wrapper.find('[data-test="service-card"]');
    expect(firstCard.classes()).toContain('custom-card-class');
  });
});