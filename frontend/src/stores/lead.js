// Lead Store
// Manages leads/prospects and their lifecycle

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export const useLeadStore = defineStore('lead', () => {
  // State
  const leads = ref([]);
  const currentLead = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const filters = ref({
    status: 'all',
    dateRange: 'all',
    source: 'all',
    isQualified: null
  });
  const sortBy = ref('createdAt');
  const sortOrder = ref('desc');

  // Getters
  const filteredLeads = computed(() => {
    let filtered = [...leads.value];

    // Apply filters
    if (filters.value.isQualified !== null) {
      filtered = filtered.filter(lead => lead.isQualified === filters.value.isQualified);
    }

    if (filters.value.status !== 'all') {
      filtered = filtered.filter(lead => {
        if (filters.value.status === 'qualified') {
          return lead.isQualified === true;
        } else if (filters.value.status === 'unqualified') {
          return lead.isQualified === false;
        }
        return true;
      });
    }

    if (filters.value.source !== 'all') {
      filtered = filtered.filter(lead => lead.source === filters.value.source);
    }

    if (filters.value.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        day: 1,
        week: 7,
        month: 30,
        year: 365
      };
      
      const days = ranges[filters.value.dateRange];
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(lead => new Date(lead.createdAt) >= cutoff);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortBy.value];
      let bVal = b[sortBy.value];

      // Handle date sorting
      if (sortBy.value === 'createdAt' || sortBy.value === 'updatedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle string sorting (case insensitive)
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder.value === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  });

  const qualifiedLeadsCount = computed(() => {
    return leads.value.filter(lead => lead.isQualified === true).length;
  });

  const recentLeads = computed(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return leads.value.filter(lead => {
      return new Date(lead.createdAt) >= sevenDaysAgo;
    });
  });

  const leadsBySource = computed(() => {
    const grouped = {};
    
    leads.value.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!grouped[source]) {
        grouped[source] = [];
      }
      grouped[source].push(lead);
    });
    
    return grouped;
  });

  const hasLeads = computed(() => leads.value.length > 0);

  // Actions
  async function createLead(leadData) {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      error.value = 'Invalid email address';
      return null;
    }

    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await axios.post('/api/leads', leadData);
      const newLead = response.data;
      
      leads.value.push(newLead);
      
      return newLead;
    } catch (err) {
      console.error('Failed to create lead:', err);
      error.value = 'Failed to create lead';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchLeads() {
    try {
      isLoading.value = true;
      error.value = null;
      
      const params = {};
      
      // Add filter params
      if (filters.value.status !== 'all') {
        params.status = filters.value.status;
      }
      if (filters.value.dateRange !== 'all') {
        params.dateRange = filters.value.dateRange;
      }
      if (filters.value.source !== 'all') {
        params.source = filters.value.source;
      }
      if (filters.value.isQualified !== null) {
        params.isQualified = filters.value.isQualified;
      }
      
      const response = await axios.get('/api/leads', { params });
      leads.value = response.data.leads || response.data;
      
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      error.value = 'Failed to fetch leads';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchLeadById(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await axios.get(`/api/leads/${id}`);
      const lead = response.data;
      
      currentLead.value = lead;
      
      // Update in leads array if exists
      const index = leads.value.findIndex(l => l.id === id);
      if (index !== -1) {
        leads.value[index] = lead;
      }
      
      return lead;
    } catch (err) {
      console.error('Failed to fetch lead:', err);
      error.value = 'Failed to fetch lead';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateLead(id, updates) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await axios.patch(`/api/leads/${id}`, updates);
      const updatedLead = response.data;
      
      // Update in leads array
      const index = leads.value.findIndex(l => l.id === id);
      if (index !== -1) {
        leads.value[index] = updatedLead;
      }
      
      // Update currentLead if it matches
      if (currentLead.value && currentLead.value.id === id) {
        currentLead.value = updatedLead;
      }
      
      return updatedLead;
    } catch (err) {
      console.error('Failed to update lead:', err);
      error.value = 'Failed to update lead';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteLead(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      await axios.delete(`/api/leads/${id}`);
      
      // Remove from leads array
      leads.value = leads.value.filter(l => l.id !== id);
      
      // Clear currentLead if it was deleted
      if (currentLead.value && currentLead.value.id === id) {
        currentLead.value = null;
      }
      
      return true;
    } catch (err) {
      console.error('Failed to delete lead:', err);
      error.value = 'Failed to delete lead';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function addNoteToLead(leadId, note) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await axios.post(`/api/leads/${leadId}/notes`, note);
      const updatedLead = response.data;
      
      // Update in leads array
      const index = leads.value.findIndex(l => l.id === leadId);
      if (index !== -1) {
        leads.value[index] = updatedLead;
      }
      
      // Update currentLead if it matches
      if (currentLead.value && currentLead.value.id === leadId) {
        currentLead.value = updatedLead;
      }
      
      return updatedLead;
    } catch (err) {
      console.error('Failed to add note:', err);
      error.value = 'Failed to add note';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function qualifyLead(id) {
    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await axios.post(`/api/leads/${id}/qualify`);
      const qualifiedLead = response.data;
      
      // Update in leads array
      const index = leads.value.findIndex(l => l.id === id);
      if (index !== -1) {
        leads.value[index] = qualifiedLead;
      }
      
      // Update currentLead if it matches
      if (currentLead.value && currentLead.value.id === id) {
        currentLead.value = qualifiedLead;
      }
      
      return true;
    } catch (err) {
      console.error('Failed to qualify lead:', err);
      error.value = 'Failed to qualify lead';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function setFilters(newFilters) {
    Object.assign(filters.value, newFilters);
  }

  function setSorting(field, order) {
    sortBy.value = field;
    sortOrder.value = order;
  }

  function clearError() {
    error.value = null;
  }

  function exportToCSV() {
    const headers = ['email', 'name', 'company', 'qualified', 'created'];
    const rows = leads.value.map(lead => [
      lead.email,
      lead.name || '',
      lead.company || '',
      lead.isQualified ? 'true' : 'false',
      lead.createdAt
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csv;
  }

  return {
    // State
    leads,
    currentLead,
    isLoading,
    error,
    filters,
    sortBy,
    sortOrder,
    
    // Getters
    filteredLeads,
    qualifiedLeadsCount,
    recentLeads,
    leadsBySource,
    hasLeads,
    
    // Actions
    createLead,
    fetchLeads,
    fetchLeadById,
    updateLead,
    deleteLead,
    addNoteToLead,
    qualifyLead,
    setFilters,
    setSorting,
    clearError,
    exportToCSV
  };
});