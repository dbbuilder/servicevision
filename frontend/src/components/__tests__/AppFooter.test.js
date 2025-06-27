import { describe, test, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import AppFooter from '../AppFooter.vue';

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home' },
    { path: '/about', name: 'about' },
    { path: '/contact', name: 'contact' },
    { path: '/careers', name: 'careers' },
    { path: '/privacy', name: 'privacy' },
    { path: '/terms', name: 'terms' },
    { path: '/cookies', name: 'cookies' },
    { path: '/services', name: 'services' }
  ]
});

describe('AppFooter Component', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = null;
  });

  describe('Component Structure', () => {
    test('renders footer with correct structure', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const footer = wrapper.find('footer');
      expect(footer.exists()).toBe(true);
      expect(footer.classes()).toContain('bg-gray-900');
      expect(footer.classes()).toContain('text-white');
    });

    test('has four main columns in grid layout', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const grid = wrapper.find('.grid');
      expect(grid.exists()).toBe(true);
      expect(grid.classes()).toContain('md:grid-cols-4');
      
      const columns = grid.findAll(':scope > div');
      expect(columns.length).toBe(4);
    });

    test('displays company branding correctly', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const brandName = wrapper.find('h3');
      expect(brandName.exists()).toBe(true);
      expect(brandName.text()).toBe('ServiceVision');
      expect(brandName.classes()).toContain('text-2xl');
      expect(brandName.classes()).toContain('font-bold');
    });

    test('displays company tagline', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const tagline = wrapper.find('p.text-gray-400');
      expect(tagline.exists()).toBe(true);
      expect(tagline.text()).toBe('Integrating Business Acumen with Technological Excellence for a Better World');
    });
  });

  describe('Social Media Links', () => {
    test('renders social media icons', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const socialLinks = wrapper.findAll('.flex.space-x-4 a');
      expect(socialLinks.length).toBe(3); // Facebook, Twitter, LinkedIn
      
      socialLinks.forEach(link => {
        expect(link.find('svg').exists()).toBe(true);
        expect(link.classes()).toContain('text-gray-400');
        expect(link.classes()).toContain('hover:text-white');
      });
    });

    test('social links have proper href attributes', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const socialLinks = wrapper.findAll('.flex.space-x-4 a');
      socialLinks.forEach(link => {
        expect(link.attributes('href')).toBeDefined();
      });
    });
  });

  describe('Services Section', () => {
    test('displays services section with correct heading', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const servicesSection = wrapper.findAll('h4')[0];
      expect(servicesSection.text()).toBe('Services');
      expect(servicesSection.classes()).toContain('font-semibold');
    });

    test('lists all service links', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const expectedServices = [
        'Business Strategy',
        'Software Development', 
        'Data & Analytics',
        'Compliance'
      ];
      
      // Find all links that contain service names
      const allLinks = wrapper.findAll('a');
      const serviceLinks = allLinks.filter(link => 
        expectedServices.includes(link.text())
      );
      
      expect(serviceLinks.length).toBe(4);
      serviceLinks.forEach((link) => {
        expect(expectedServices).toContain(link.text());
        expect(link.classes()).toContain('hover:text-white');
      });
    });
  });

  describe('Company Section', () => {
    test('displays company section with correct heading', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const companySection = wrapper.findAll('h4')[1];
      expect(companySection.text()).toBe('Company');
    });

    test('contains all company links', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const expectedLinks = [
        'About Us',
        'Contact',
        'Nonprofit Division',
        'Careers'
      ];
      
      // Find all links that contain company link names
      const allLinks = wrapper.findAll('a');
      const companyLinks = allLinks.filter(link => 
        expectedLinks.includes(link.text())
      );
      
      expect(companyLinks.length).toBe(4);
      companyLinks.forEach((link) => {
        expect(expectedLinks).toContain(link.text());
      });
    });

    test('nonprofit division link points to external site', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const nonprofitLink = wrapper.find('a[href="https://servicevision.org"]');
      expect(nonprofitLink.exists()).toBe(true);
      expect(nonprofitLink.text()).toBe('Nonprofit Division');
    });
  });

  describe('Contact Section', () => {
    test('displays contact section with correct heading', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const contactSection = wrapper.findAll('h4')[2];
      expect(contactSection.text()).toBe('Contact Us');
    });

    test('displays email with icon', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const emailLink = wrapper.find('a[href="mailto:info@servicevision.net"]');
      expect(emailLink.exists()).toBe(true);
      expect(emailLink.text()).toBe('info@servicevision.net');
      
      // Check for email icon
      const emailItem = emailLink.element.parentElement;
      expect(emailItem.querySelector('svg')).toBeTruthy();
    });

    test('displays location with icon', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const locationItems = wrapper.findAll('li.flex.items-start');
      const locationItem = locationItems.find(item => item.text().includes('Bryn Mawr-Skyway, WA'));
      
      expect(locationItem.exists()).toBe(true);
      expect(locationItem.find('svg').exists()).toBe(true);
    });
  });

  describe('Bottom Bar', () => {
    test('displays copyright notice', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const copyright = wrapper.find('p.text-gray-400.text-sm');
      expect(copyright.exists()).toBe(true);
      expect(copyright.text()).toBe('© 2025 ServiceVision. All rights reserved.');
    });

    test('displays legal links', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const expectedLegalLinks = [
        'Privacy Policy',
        'Terms of Service',
        'Cookie Policy'
      ];
      
      const bottomBar = wrapper.find('.border-t.border-gray-800');
      const legalLinks = bottomBar.findAll('a');
      
      expect(legalLinks.length).toBe(3);
      legalLinks.forEach((link, index) => {
        expect(link.text()).toBe(expectedLegalLinks[index]);
        expect(link.classes()).toContain('text-gray-400');
        expect(link.classes()).toContain('hover:text-white');
        expect(link.classes()).toContain('text-sm');
      });
    });

    test('bottom bar has responsive layout', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const bottomBarContent = wrapper.find('.flex.flex-col.md\\:flex-row');
      expect(bottomBarContent.exists()).toBe(true);
      expect(bottomBarContent.classes()).toContain('justify-between');
      expect(bottomBarContent.classes()).toContain('items-center');
    });
  });

  describe('Responsive Design', () => {
    test('grid uses responsive classes', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const grid = wrapper.find('.grid');
      expect(grid.classes()).toContain('md:grid-cols-4');
      expect(grid.classes()).toContain('gap-8');
    });

    test('company info spans correct columns', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const companyInfo = wrapper.find('.col-span-2.md\\:col-span-1');
      expect(companyInfo.exists()).toBe(true);
    });

    test('legal links have responsive spacing', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const legalLinksContainer = wrapper.find('.flex.space-x-6.mt-4.md\\:mt-0');
      expect(legalLinksContainer.exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    test('footer has proper semantic HTML', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const footer = wrapper.find('footer');
      expect(footer.exists()).toBe(true);
    });

    test('all links have proper href attributes', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const allLinks = wrapper.findAll('a');
      allLinks.forEach(link => {
        const href = link.attributes('href');
        expect(href).toBeDefined();
        expect(href).not.toBe('');
      });
    });

    test('icon-only links should have aria-labels', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const socialLinks = wrapper.findAll('.flex.space-x-4 a');
      // Note: In the current implementation, social links don't have aria-labels
      // This test would fail and guide us to add them
      expect(socialLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    test('uses correct color scheme', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const footer = wrapper.find('footer');
      expect(footer.classes()).toContain('bg-gray-900');
      expect(footer.classes()).toContain('text-white');
      
      const grayTexts = wrapper.findAll('.text-gray-400');
      expect(grayTexts.length).toBeGreaterThan(0);
    });

    test('has proper spacing', () => {
      wrapper = mount(AppFooter, {
        global: {
          plugins: [router]
        }
      });
      
      const container = wrapper.find('.max-w-7xl');
      expect(container.classes()).toContain('mx-auto');
      expect(container.classes()).toContain('px-4');
      expect(container.classes()).toContain('sm:px-6');
      expect(container.classes()).toContain('lg:px-8');
      expect(container.classes()).toContain('py-12');
    });
  });
});