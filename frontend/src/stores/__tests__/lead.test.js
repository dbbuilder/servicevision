import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLeadStore } from '../lead';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('Lead Store', () => {
  let store;

  beforeEach(() => {
    // Create a fresh Pinia instance before each test
    setActivePinia(createPinia());
    store = useLeadStore();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      expect(store.leads).toEqual([]);
      expect(store.currentLead).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.filters).toEqual({
        status: 'all',
        dateRange: 'all',
        source: 'all',
        isQualified: null
      });
      expect(store.sortBy).toBe('createdAt');
      expect(store.sortOrder).toBe('desc');
    });
  });

  describe('Actions', () => {
    describe('createLead', () => {
      test('should create a new lead successfully', async () => {
        const leadData = {
          email: 'test@example.com',
          name: 'John Doe',
          company: 'Test Corp',
          sessionId: 'session-123'
        };

        const mockResponse = {
          data: {
            id: 1,
            ...leadData,
            isQualified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await store.createLead(leadData);

        expect(axios.post).toHaveBeenCalledWith('/api/leads', leadData);
        expect(result).toEqual(mockResponse.data);
        expect(store.leads).toContainEqual(mockResponse.data);
        expect(store.error).toBeNull();
      });

      test('should handle lead creation error', async () => {
        const leadData = {
          email: 'test@example.com'
        };

        axios.post.mockRejectedValue(new Error('Server error'));

        const result = await store.createLead(leadData);

        expect(result).toBeNull();
        expect(store.error).toBe('Failed to create lead');
      });

      test('should validate email before creating lead', async () => {
        const leadData = {
          email: 'invalid-email'
        };

        const result = await store.createLead(leadData);

        expect(axios.post).not.toHaveBeenCalled();
        expect(result).toBeNull();
        expect(store.error).toBe('Invalid email address');
      });
    });

    describe('fetchLeads', () => {
      test('should fetch all leads successfully', async () => {
        const mockLeads = [
          {
            id: 1,
            email: 'lead1@example.com',
            name: 'Lead One',
            isQualified: true,
            createdAt: '2024-01-27T10:00:00Z'
          },
          {
            id: 2,
            email: 'lead2@example.com',
            name: 'Lead Two',
            isQualified: false,
            createdAt: '2024-01-27T11:00:00Z'
          }
        ];

        axios.get.mockResolvedValue({ data: { leads: mockLeads } });

        await store.fetchLeads();

        expect(axios.get).toHaveBeenCalledWith('/api/leads', {
          params: {}
        });
        expect(store.leads).toEqual(mockLeads);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBeNull();
      });

      test('should fetch leads with filters', async () => {
        store.filters = {
          status: 'qualified',
          dateRange: 'week',
          source: 'chat',
          isQualified: true
        };

        axios.get.mockResolvedValue({ data: { leads: [] } });

        await store.fetchLeads();

        expect(axios.get).toHaveBeenCalledWith('/api/leads', {
          params: {
            status: 'qualified',
            dateRange: 'week',
            source: 'chat',
            isQualified: true
          }
        });
      });

      test('should handle fetch error', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));

        await store.fetchLeads();

        expect(store.error).toBe('Failed to fetch leads');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('fetchLeadById', () => {
      test('should fetch a single lead by ID', async () => {
        const mockLead = {
          id: 1,
          email: 'test@example.com',
          name: 'Test Lead',
          chatSessions: [],
          notes: 'Test notes'
        };

        axios.get.mockResolvedValue({ data: mockLead });

        const result = await store.fetchLeadById(1);

        expect(axios.get).toHaveBeenCalledWith('/api/leads/1');
        expect(result).toEqual(mockLead);
        expect(store.currentLead).toEqual(mockLead);
      });

      test('should handle fetch by ID error', async () => {
        axios.get.mockRejectedValue(new Error('Not found'));

        const result = await store.fetchLeadById(999);

        expect(result).toBeNull();
        expect(store.error).toBe('Failed to fetch lead');
      });
    });

    describe('updateLead', () => {
      test('should update lead successfully', async () => {
        const leadId = 1;
        const updates = {
          isQualified: true,
          notes: 'Updated notes'
        };

        const updatedLead = {
          id: leadId,
          email: 'test@example.com',
          ...updates,
          updatedAt: new Date().toISOString()
        };

        // Add initial lead to store
        store.leads = [
          { id: leadId, email: 'test@example.com', isQualified: false }
        ];

        axios.patch.mockResolvedValue({ data: updatedLead });

        const result = await store.updateLead(leadId, updates);

        expect(axios.patch).toHaveBeenCalledWith(`/api/leads/${leadId}`, updates);
        expect(result).toEqual(updatedLead);
        expect(store.leads[0]).toEqual(updatedLead);
        
        // Should also update currentLead if it matches
        store.currentLead = { id: leadId };
        await store.updateLead(leadId, updates);
        expect(store.currentLead).toEqual(updatedLead);
      });

      test('should handle update error', async () => {
        axios.patch.mockRejectedValue(new Error('Update failed'));

        const result = await store.updateLead(1, { notes: 'test' });

        expect(result).toBeNull();
        expect(store.error).toBe('Failed to update lead');
      });
    });

    describe('deleteLead', () => {
      test('should delete lead successfully', async () => {
        store.leads = [
          { id: 1, email: 'test1@example.com' },
          { id: 2, email: 'test2@example.com' }
        ];

        axios.delete.mockResolvedValue({ data: { success: true } });

        const result = await store.deleteLead(1);

        expect(axios.delete).toHaveBeenCalledWith('/api/leads/1');
        expect(result).toBe(true);
        expect(store.leads).toHaveLength(1);
        expect(store.leads[0].id).toBe(2);
      });

      test('should handle delete error', async () => {
        axios.delete.mockRejectedValue(new Error('Delete failed'));

        const result = await store.deleteLead(1);

        expect(result).toBe(false);
        expect(store.error).toBe('Failed to delete lead');
      });
    });

    describe('addNoteToLead', () => {
      test('should add note to lead successfully', async () => {
        const leadId = 1;
        const note = {
          content: 'Follow up next week',
          author: 'Admin'
        };

        const updatedLead = {
          id: leadId,
          notes: [
            { id: 1, ...note, createdAt: new Date().toISOString() }
          ]
        };

        axios.post.mockResolvedValue({ data: updatedLead });

        const result = await store.addNoteToLead(leadId, note);

        expect(axios.post).toHaveBeenCalledWith(`/api/leads/${leadId}/notes`, note);
        expect(result).toEqual(updatedLead);
      });
    });

    describe('qualifyLead', () => {
      test('should qualify a lead', async () => {
        const leadId = 1;
        store.leads = [
          { id: leadId, isQualified: false }
        ];

        const qualifiedLead = {
          id: leadId,
          isQualified: true,
          qualifiedAt: new Date().toISOString()
        };

        axios.post.mockResolvedValue({ data: qualifiedLead });

        const result = await store.qualifyLead(leadId);

        expect(axios.post).toHaveBeenCalledWith(`/api/leads/${leadId}/qualify`);
        expect(result).toBe(true);
        expect(store.leads[0].isQualified).toBe(true);
      });
    });

    describe('setFilters', () => {
      test('should update filters', () => {
        const newFilters = {
          status: 'qualified',
          dateRange: 'month'
        };

        store.setFilters(newFilters);

        expect(store.filters.status).toBe('qualified');
        expect(store.filters.dateRange).toBe('month');
        expect(store.filters.source).toBe('all'); // Unchanged
      });
    });

    describe('setSorting', () => {
      test('should update sorting options', () => {
        store.setSorting('name', 'asc');

        expect(store.sortBy).toBe('name');
        expect(store.sortOrder).toBe('asc');
      });
    });

    describe('clearError', () => {
      test('should clear error state', () => {
        store.error = 'Some error';
        store.clearError();
        expect(store.error).toBeNull();
      });
    });
  });

  describe('Getters', () => {
    test('filteredLeads should return filtered and sorted leads', () => {
      store.leads = [
        {
          id: 1,
          name: 'Alice',
          isQualified: true,
          createdAt: '2024-01-27T10:00:00Z'
        },
        {
          id: 2,
          name: 'Bob',
          isQualified: false,
          createdAt: '2024-01-27T11:00:00Z'
        },
        {
          id: 3,
          name: 'Charlie',
          isQualified: true,
          createdAt: '2024-01-27T09:00:00Z'
        }
      ];

      // Test filtering by qualification status
      store.filters.isQualified = true;
      expect(store.filteredLeads).toHaveLength(2);
      expect(store.filteredLeads.map(l => l.name)).toEqual(['Alice', 'Charlie']);

      // Test sorting
      store.filters.isQualified = null;
      store.sortBy = 'name';
      store.sortOrder = 'asc';
      expect(store.filteredLeads.map(l => l.name)).toEqual(['Alice', 'Bob', 'Charlie']);

      // Test reverse sorting
      store.sortOrder = 'desc';
      expect(store.filteredLeads.map(l => l.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    test('qualifiedLeadsCount should return count of qualified leads', () => {
      store.leads = [
        { id: 1, isQualified: true },
        { id: 2, isQualified: false },
        { id: 3, isQualified: true }
      ];

      expect(store.qualifiedLeadsCount).toBe(2);
    });

    test('recentLeads should return leads from last 7 days', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      store.leads = [
        { id: 1, createdAt: now.toISOString() },
        { id: 2, createdAt: yesterday.toISOString() },
        { id: 3, createdAt: lastWeek.toISOString() }
      ];

      expect(store.recentLeads).toHaveLength(2);
      expect(store.recentLeads.map(l => l.id)).toEqual([1, 2]);
    });

    test('leadsBySource should group leads by source', () => {
      store.leads = [
        { id: 1, source: 'chat' },
        { id: 2, source: 'chat' },
        { id: 3, source: 'contact' },
        { id: 4, source: 'landing' }
      ];

      const grouped = store.leadsBySource;
      expect(grouped.chat).toHaveLength(2);
      expect(grouped.contact).toHaveLength(1);
      expect(grouped.landing).toHaveLength(1);
    });

    test('hasLeads should return true when leads exist', () => {
      expect(store.hasLeads).toBe(false);
      
      store.leads = [{ id: 1 }];
      expect(store.hasLeads).toBe(true);
    });
  });

  describe('Persistence', () => {
    test('should export leads to CSV format', () => {
      store.leads = [
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test Lead',
          company: 'Test Corp',
          isQualified: true,
          createdAt: '2024-01-27T10:00:00Z'
        }
      ];

      const csv = store.exportToCSV();
      
      expect(csv).toContain('email,name,company,qualified,created');
      expect(csv).toContain('test@example.com,Test Lead,Test Corp,true,2024-01-27T10:00:00Z');
    });
  });
});