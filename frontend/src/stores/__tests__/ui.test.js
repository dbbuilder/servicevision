import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '../ui';

describe('UI Store', () => {
  let store;

  beforeEach(() => {
    // Create a fresh Pinia instance before each test
    setActivePinia(createPinia());
    store = useUIStore();
    vi.clearAllMocks();
    
    // Mock timers for notification auto-dismiss
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      expect(store.modals).toEqual({});
      expect(store.notifications).toEqual([]);
      expect(store.loadingStates).toEqual({});
      expect(store.sidebarOpen).toBe(false);
      expect(store.theme).toBe('light');
    });
  });

  describe('Modal Management', () => {
    test('should open a modal with data', () => {
      const modalData = {
        title: 'Confirm Action',
        message: 'Are you sure?',
        confirmText: 'Yes',
        cancelText: 'No'
      };

      store.openModal('confirm', modalData);

      expect(store.modals.confirm).toEqual({
        isOpen: true,
        data: modalData
      });
    });

    test('should close a modal', () => {
      store.openModal('confirm', { title: 'Test' });
      expect(store.modals.confirm.isOpen).toBe(true);

      store.closeModal('confirm');
      expect(store.modals.confirm).toBeUndefined();
    });

    test('should close all modals', () => {
      store.openModal('confirm', { title: 'Confirm' });
      store.openModal('alert', { message: 'Alert!' });
      
      expect(Object.keys(store.modals).length).toBe(2);

      store.closeAllModals();
      expect(store.modals).toEqual({});
    });

    test('should check if modal is open', () => {
      expect(store.isModalOpen('confirm')).toBe(false);
      
      store.openModal('confirm', {});
      expect(store.isModalOpen('confirm')).toBe(true);
    });

    test('should get modal data', () => {
      const data = { title: 'Test Modal' };
      store.openModal('test', data);
      
      expect(store.getModalData('test')).toEqual(data);
      expect(store.getModalData('nonexistent')).toBeNull();
    });
  });

  describe('Notification Management', () => {
    test('should add a success notification', () => {
      const message = 'Operation successful!';
      const notification = store.showNotification(message, 'success');

      expect(notification).toEqual({
        id: expect.any(String),
        message,
        type: 'success',
        duration: 5000,
        timestamp: expect.any(Date)
      });

      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0]).toEqual(notification);
    });

    test('should add different types of notifications', () => {
      store.showNotification('Error occurred', 'error');
      store.showNotification('Warning message', 'warning');
      store.showNotification('Info message', 'info');

      expect(store.notifications).toHaveLength(3);
      expect(store.notifications[0].type).toBe('error');
      expect(store.notifications[1].type).toBe('warning');
      expect(store.notifications[2].type).toBe('info');
    });

    test('should add notification with custom duration', () => {
      const notification = store.showNotification('Custom duration', 'info', 10000);
      
      expect(notification.duration).toBe(10000);
    });

    test('should remove a notification by ID', () => {
      const notification = store.showNotification('Test', 'info');
      expect(store.notifications).toHaveLength(1);

      store.removeNotification(notification.id);
      expect(store.notifications).toHaveLength(0);
    });

    test('should auto-dismiss notifications after duration', () => {
      store.showNotification('Auto dismiss', 'info', 3000);
      expect(store.notifications).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(3001);
      
      expect(store.notifications).toHaveLength(0);
    });

    test('should clear all notifications', () => {
      store.showNotification('Message 1', 'info');
      store.showNotification('Message 2', 'success');
      store.showNotification('Message 3', 'error');

      expect(store.notifications).toHaveLength(3);

      store.clearNotifications();
      expect(store.notifications).toHaveLength(0);
    });

    test('should have convenience methods for notification types', () => {
      store.showSuccess('Success!');
      store.showError('Error!');
      store.showWarning('Warning!');
      store.showInfo('Info!');

      expect(store.notifications).toHaveLength(4);
      expect(store.notifications[0].type).toBe('success');
      expect(store.notifications[1].type).toBe('error');
      expect(store.notifications[2].type).toBe('warning');
      expect(store.notifications[3].type).toBe('info');
    });
  });

  describe('Loading States', () => {
    test('should set loading state for a key', () => {
      store.setLoading('fetchData', true);
      expect(store.loadingStates.fetchData).toBe(true);
      expect(store.isLoading('fetchData')).toBe(true);

      store.setLoading('fetchData', false);
      expect(store.loadingStates.fetchData).toBe(false);
      expect(store.isLoading('fetchData')).toBe(false);
    });

    test('should handle multiple loading states', () => {
      store.setLoading('operation1', true);
      store.setLoading('operation2', true);
      store.setLoading('operation3', false);

      expect(store.isLoading('operation1')).toBe(true);
      expect(store.isLoading('operation2')).toBe(true);
      expect(store.isLoading('operation3')).toBe(false);
      expect(store.isLoading('nonexistent')).toBe(false);
    });

    test('should check if any operation is loading', () => {
      expect(store.isAnyLoading).toBe(false);

      store.setLoading('op1', true);
      expect(store.isAnyLoading).toBe(true);

      store.setLoading('op2', true);
      expect(store.isAnyLoading).toBe(true);

      store.setLoading('op1', false);
      expect(store.isAnyLoading).toBe(true);

      store.setLoading('op2', false);
      expect(store.isAnyLoading).toBe(false);
    });

    test('should clear all loading states', () => {
      store.setLoading('op1', true);
      store.setLoading('op2', true);
      store.setLoading('op3', true);

      store.clearAllLoading();
      
      expect(store.loadingStates).toEqual({});
      expect(store.isAnyLoading).toBe(false);
    });
  });

  describe('Sidebar Management', () => {
    test('should toggle sidebar', () => {
      expect(store.sidebarOpen).toBe(false);
      
      store.toggleSidebar();
      expect(store.sidebarOpen).toBe(true);
      
      store.toggleSidebar();
      expect(store.sidebarOpen).toBe(false);
    });

    test('should open sidebar', () => {
      store.openSidebar();
      expect(store.sidebarOpen).toBe(true);
      
      // Opening again should keep it open
      store.openSidebar();
      expect(store.sidebarOpen).toBe(true);
    });

    test('should close sidebar', () => {
      store.sidebarOpen = true;
      
      store.closeSidebar();
      expect(store.sidebarOpen).toBe(false);
      
      // Closing again should keep it closed
      store.closeSidebar();
      expect(store.sidebarOpen).toBe(false);
    });
  });

  describe('Theme Management', () => {
    test('should toggle theme between light and dark', () => {
      expect(store.theme).toBe('light');
      expect(store.isDarkMode).toBe(false);
      
      store.toggleTheme();
      expect(store.theme).toBe('dark');
      expect(store.isDarkMode).toBe(true);
      
      store.toggleTheme();
      expect(store.theme).toBe('light');
      expect(store.isDarkMode).toBe(false);
    });

    test('should set theme explicitly', () => {
      store.setTheme('dark');
      expect(store.theme).toBe('dark');
      expect(store.isDarkMode).toBe(true);
      
      store.setTheme('light');
      expect(store.theme).toBe('light');
      expect(store.isDarkMode).toBe(false);
    });

    test('should apply theme to document', () => {
      // Mock document
      const mockClassList = {
        add: vi.fn(),
        remove: vi.fn()
      };
      global.document = {
        documentElement: {
          classList: mockClassList
        }
      };

      store.setTheme('dark');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
      
      store.setTheme('light');
      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('Confirm Dialog', () => {
    test('should show confirm dialog and resolve on confirm', async () => {
      const confirmPromise = store.confirm({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmClass: 'danger'
      });

      expect(store.modals.confirm).toBeDefined();
      expect(store.modals.confirm.isOpen).toBe(true);
      expect(store.modals.confirm.data.title).toBe('Delete Item');

      // Simulate user clicking confirm
      const modalData = store.getModalData('confirm');
      modalData.onConfirm();

      const result = await confirmPromise;
      expect(result).toBe(true);
      expect(store.modals.confirm).toBeUndefined();
    });

    test('should show confirm dialog and resolve on cancel', async () => {
      const confirmPromise = store.confirm({
        title: 'Confirm',
        message: 'Continue?'
      });

      // Simulate user clicking cancel
      const modalData = store.getModalData('confirm');
      modalData.onCancel();

      const result = await confirmPromise;
      expect(result).toBe(false);
      expect(store.modals.confirm).toBeUndefined();
    });
  });

  describe('Persistence', () => {
    test('should persist and restore theme preference', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn()
      };
      global.localStorage = mockLocalStorage;

      // Test saving theme
      store.setTheme('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ui-theme', 'dark');

      // Test loading theme
      mockLocalStorage.getItem.mockReturnValue('dark');
      store.loadThemePreference();
      expect(store.theme).toBe('dark');
    });
  });
});