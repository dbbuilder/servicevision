// UI/UX Store
// Manages global UI state including modals, notifications, loading states, and theme

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUIStore = defineStore('ui', () => {
  // State
  const modals = ref({});
  const notifications = ref([]);
  const loadingStates = ref({});
  const sidebarOpen = ref(false);
  const theme = ref('light');

  // Getters
  const isDarkMode = computed(() => theme.value === 'dark');
  const isAnyLoading = computed(() => Object.values(loadingStates.value).some(state => state));

  // Modal Management
  function openModal(name, data = {}) {
    modals.value[name] = {
      isOpen: true,
      data
    };
  }

  function closeModal(name) {
    delete modals.value[name];
  }

  function closeAllModals() {
    modals.value = {};
  }

  function isModalOpen(name) {
    return modals.value[name]?.isOpen || false;
  }

  function getModalData(name) {
    return modals.value[name]?.data || null;
  }

  // Notification Management
  function showNotification(message, type = 'info', duration = 5000) {
    const notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      duration,
      timestamp: new Date()
    };

    notifications.value.push(notification);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    }

    return notification;
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  }

  function clearNotifications() {
    notifications.value = [];
  }

  // Convenience methods for different notification types
  function showSuccess(message, duration) {
    return showNotification(message, 'success', duration);
  }

  function showError(message, duration) {
    return showNotification(message, 'error', duration);
  }

  function showWarning(message, duration) {
    return showNotification(message, 'warning', duration);
  }

  function showInfo(message, duration) {
    return showNotification(message, 'info', duration);
  }

  // Loading State Management
  function setLoading(key, value) {
    if (value) {
      loadingStates.value[key] = true;
    } else {
      loadingStates.value[key] = false;
    }
  }

  function isLoading(key) {
    return loadingStates.value[key] || false;
  }

  function clearAllLoading() {
    loadingStates.value = {};
  }

  // Sidebar Management
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function openSidebar() {
    sidebarOpen.value = true;
  }

  function closeSidebar() {
    sidebarOpen.value = false;
  }

  // Theme Management
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    applyTheme();
    saveThemePreference();
  }

  function setTheme(newTheme) {
    theme.value = newTheme;
    applyTheme();
    saveThemePreference();
  }

  function applyTheme() {
    if (typeof document !== 'undefined') {
      if (theme.value === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  function saveThemePreference() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ui-theme', theme.value);
    }
  }

  function loadThemePreference() {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('ui-theme');
      if (savedTheme) {
        theme.value = savedTheme;
        applyTheme();
      }
    }
  }

  // Confirm Dialog
  function confirm(options) {
    return new Promise((resolve) => {
      const defaultOptions = {
        title: 'Confirm',
        message: 'Are you sure?',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        confirmClass: 'primary'
      };

      const modalData = {
        ...defaultOptions,
        ...options,
        onConfirm: () => {
          closeModal('confirm');
          resolve(true);
        },
        onCancel: () => {
          closeModal('confirm');
          resolve(false);
        }
      };

      openModal('confirm', modalData);
    });
  }

  // Initialize theme on store creation
  loadThemePreference();

  return {
    // State
    modals,
    notifications,
    loadingStates,
    sidebarOpen,
    theme,

    // Getters
    isDarkMode,
    isAnyLoading,

    // Modal actions
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalData,

    // Notification actions
    showNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Loading actions
    setLoading,
    isLoading,
    clearAllLoading,

    // Sidebar actions
    toggleSidebar,
    openSidebar,
    closeSidebar,

    // Theme actions
    toggleTheme,
    setTheme,
    loadThemePreference,

    // Utility actions
    confirm
  };
});