import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HeroSection from '../HeroSection.vue';
import { createRouter, createWebHistory } from 'vue-router';

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: []
});

describe('HeroSection Component', () => {
  test('renders main headline and tagline', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    expect(wrapper.find('h1').exists()).toBe(true);
    expect(wrapper.find('h1').text()).toContain('Transform Your Business');
    
    const tagline = wrapper.find('[data-test="tagline"]');
    expect(tagline.exists()).toBe(true);
    expect(tagline.text()).toContain('AI-powered consulting');
  });

  test('displays two CTA buttons with correct text', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    
    const primaryBtn = wrapper.find('[data-test="cta-primary"]');
    const secondaryBtn = wrapper.find('[data-test="cta-secondary"]');
    
    expect(primaryBtn.text()).toBe('Start Free Consultation');
    expect(secondaryBtn.text()).toBe('Learn More');
  });

  test('emits start-chat event when primary CTA is clicked', async () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const primaryBtn = wrapper.find('[data-test="cta-primary"]');
    await primaryBtn.trigger('click');
    
    expect(wrapper.emitted('start-chat')).toBeTruthy();
    expect(wrapper.emitted('start-chat')).toHaveLength(1);
  });

  test('scrolls to services section when Learn More is clicked', async () => {
    // Mock scrollIntoView
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    // Mock getElementById
    const mockElement = document.createElement('div');
    mockElement.id = 'services';
    document.getElementById = vi.fn().mockReturnValue(mockElement);
    
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const secondaryBtn = wrapper.find('[data-test="cta-secondary"]');
    await secondaryBtn.trigger('click');
    
    expect(document.getElementById).toHaveBeenCalledWith('services');
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  test('displays value propositions', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const valueProps = wrapper.findAll('[data-test="value-prop"]');
    expect(valueProps.length).toBeGreaterThanOrEqual(3);
    
    const propTexts = valueProps.map(vp => vp.text());
    expect(propTexts.some(text => text.includes('ROI'))).toBe(true);
    expect(propTexts.some(text => text.includes('Expert'))).toBe(true);
    expect(propTexts.some(text => text.includes('AI'))).toBe(true);
  });

  test('has responsive design classes', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const container = wrapper.find('[data-test="hero-container"]');
    expect(container.classes()).toContain('px-4');
    expect(container.classes()).toContain('lg:px-8');
    
    const content = wrapper.find('[data-test="hero-content"]');
    expect(content.classes()).toContain('max-w-7xl');
    expect(content.classes()).toContain('mx-auto');
  });

  test('includes hero image or graphic', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const heroVisual = wrapper.find('[data-test="hero-visual"]');
    expect(heroVisual.exists()).toBe(true);
    
    // Should have either an img tag or svg
    const hasImage = heroVisual.find('img').exists() || heroVisual.find('svg').exists();
    expect(hasImage).toBe(true);
  });

  test('applies gradient background', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const heroSection = wrapper.find('[data-test="hero-section"]');
    const classes = heroSection.classes().join(' ');
    
    // Check for gradient classes
    expect(classes).toMatch(/bg-gradient-to-/);
  });

  test('is accessible with proper ARIA labels', () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const primaryBtn = wrapper.find('[data-test="cta-primary"]');
    expect(primaryBtn.attributes('aria-label')).toBeTruthy();
    
    const section = wrapper.find('[data-test="hero-section"]');
    expect(section.attributes('role')).toBe('banner');
  });

  test('handles loading state for chat initialization', async () => {
    const wrapper = mount(HeroSection, {
      global: {
        plugins: [router]
      }
    });
    
    const primaryBtn = wrapper.find('[data-test="cta-primary"]');
    
    // Click button
    await primaryBtn.trigger('click');
    
    // Check for loading state
    expect(primaryBtn.attributes('disabled')).toBeDefined();
    expect(primaryBtn.classes()).toContain('opacity-75');
    
    // Should show loading spinner or text
    const loadingIndicator = primaryBtn.find('[data-test="loading"]');
    expect(loadingIndicator.exists() || primaryBtn.text().includes('...')).toBe(true);
  });
});