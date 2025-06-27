const drawingService = require('../drawingService');
const { Lead, Drawing, DrawingEntry } = require('../../models');
const emailService = require('../emailService');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models');
jest.mock('../emailService');
jest.mock('../../utils/logger');

describe('Drawing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks
    Drawing.findOne = jest.fn();
    Drawing.create = jest.fn();
    DrawingEntry.findAll = jest.fn();
    DrawingEntry.create = jest.fn();
    Lead.findOne = jest.fn();
    Lead.findAll = jest.fn();
  });

  describe('createMonthlyDrawing', () => {
    test('should create a new monthly drawing', async () => {
      const mockDrawing = {
        id: 1,
        name: 'January 2024 Drawing',
        type: 'monthly',
        status: 'active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        save: jest.fn()
      };

      Drawing.create.mockResolvedValue(mockDrawing);

      const result = await drawingService.createMonthlyDrawing();

      expect(Drawing.create).toHaveBeenCalledWith({
        name: expect.stringContaining('Drawing'),
        type: 'monthly',
        status: 'active',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        prizeDetails: {
          type: 'consultation',
          value: 250,
          duration: '60 minutes'
        }
      });
      expect(result).toEqual(mockDrawing);
    });

    test('should not create drawing if one already exists for the month', async () => {
      const existingDrawing = {
        id: 1,
        name: 'January 2024 Drawing',
        status: 'active'
      };

      Drawing.findOne.mockResolvedValue(existingDrawing);

      const result = await drawingService.createMonthlyDrawing();

      expect(Drawing.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingDrawing);
    });

    test('should handle creation errors', async () => {
      Drawing.findOne.mockResolvedValue(null);
      Drawing.create.mockRejectedValue(new Error('Database error'));

      await expect(drawingService.createMonthlyDrawing())
        .rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating monthly drawing:',
        expect.any(Error)
      );
    });
  });

  describe('enterDrawing', () => {
    test('should add lead to drawing', async () => {
      const mockLead = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockDrawing = {
        id: 1,
        status: 'active'
      };

      const mockEntry = {
        id: 1,
        leadId: 1,
        drawingId: 1,
        entryDate: new Date()
      };

      Lead.findOne.mockResolvedValue(mockLead);
      Drawing.findOne.mockResolvedValue(mockDrawing);
      DrawingEntry.findOne = jest.fn().mockResolvedValue(null);
      DrawingEntry.create.mockResolvedValue(mockEntry);

      const result = await drawingService.enterDrawing('test@example.com');

      expect(Lead.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(DrawingEntry.create).toHaveBeenCalledWith({
        leadId: 1,
        drawingId: 1,
        entryDate: expect.any(Date)
      });
      expect(result).toEqual({
        success: true,
        entry: mockEntry,
        message: 'Successfully entered into drawing'
      });
    });

    test('should not allow duplicate entries', async () => {
      const mockLead = { id: 1 };
      const mockDrawing = { id: 1, status: 'active' };
      const existingEntry = { id: 1 };

      Lead.findOne.mockResolvedValue(mockLead);
      Drawing.findOne.mockResolvedValue(mockDrawing);
      DrawingEntry.findOne = jest.fn().mockResolvedValue(existingEntry);

      const result = await drawingService.enterDrawing('test@example.com');

      expect(DrawingEntry.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Already entered in current drawing'
      });
    });

    test('should handle lead not found', async () => {
      Lead.findOne.mockResolvedValue(null);

      const result = await drawingService.enterDrawing('nonexistent@example.com');

      expect(result).toEqual({
        success: false,
        message: 'Lead not found'
      });
    });

    test('should handle no active drawing', async () => {
      const mockLead = { id: 1 };
      Lead.findOne.mockResolvedValue(mockLead);
      Drawing.findOne.mockResolvedValue(null);

      const result = await drawingService.enterDrawing('test@example.com');

      expect(result).toEqual({
        success: false,
        message: 'No active drawing available'
      });
    });
  });

  describe('selectWinner', () => {
    test('should randomly select a winner from entries', async () => {
      const mockDrawing = {
        id: 1,
        name: 'January 2024 Drawing',
        status: 'active',
        prizeDetails: {
          type: 'consultation',
          value: 250,
          duration: '60 minutes'
        },
        update: jest.fn()
      };

      const mockEntries = [
        {
          id: 1,
          leadId: 1,
          Lead: {
            id: 1,
            email: 'user1@example.com',
            name: 'User One'
          }
        },
        {
          id: 2,
          leadId: 2,
          Lead: {
            id: 2,
            email: 'user2@example.com',
            name: 'User Two'
          }
        },
        {
          id: 3,
          leadId: 3,
          Lead: {
            id: 3,
            email: 'user3@example.com',
            name: 'User Three'
          }
        }
      ];

      Drawing.findByPk = jest.fn().mockResolvedValue(mockDrawing);
      DrawingEntry.findAll.mockResolvedValue(mockEntries);
      emailService.sendDrawingWinnerNotification = jest.fn()
        .mockResolvedValue({ success: true });

      const result = await drawingService.selectWinner(1);

      expect(Drawing.findByPk).toHaveBeenCalledWith(1);
      expect(DrawingEntry.findAll).toHaveBeenCalledWith({
        where: { drawingId: 1 },
        include: [{
          model: Lead,
          attributes: ['id', 'email', 'name', 'company']
        }]
      });
      
      expect(mockDrawing.update).toHaveBeenCalledWith({
        status: 'completed',
        winnerId: expect.any(Number),
        completedAt: expect.any(Date)
      });

      expect(emailService.sendDrawingWinnerNotification).toHaveBeenCalledWith({
        email: expect.any(String),
        name: expect.any(String),
        prizeDetails: mockDrawing.prizeDetails
      });

      expect(result).toEqual({
        success: true,
        winner: expect.objectContaining({
          id: expect.any(Number),
          email: expect.any(String),
          name: expect.any(String)
        }),
        totalEntries: 3
      });
    });

    test('should handle drawing with no entries', async () => {
      const mockDrawing = {
        id: 1,
        status: 'active'
      };

      Drawing.findByPk = jest.fn().mockResolvedValue(mockDrawing);
      DrawingEntry.findAll.mockResolvedValue([]);

      const result = await drawingService.selectWinner(1);

      expect(result).toEqual({
        success: false,
        message: 'No entries found for this drawing'
      });
    });

    test('should not select winner for completed drawing', async () => {
      const mockDrawing = {
        id: 1,
        status: 'completed',
        winnerId: 1
      };

      Drawing.findByPk = jest.fn().mockResolvedValue(mockDrawing);

      const result = await drawingService.selectWinner(1);

      expect(DrawingEntry.findAll).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Drawing already completed'
      });
    });

    test('should handle drawing not found', async () => {
      Drawing.findByPk = jest.fn().mockResolvedValue(null);

      const result = await drawingService.selectWinner(999);

      expect(result).toEqual({
        success: false,
        message: 'Drawing not found'
      });
    });

    test('should handle email notification failure gracefully', async () => {
      const mockDrawing = {
        id: 1,
        status: 'active',
        prizeDetails: { type: 'consultation' },
        update: jest.fn()
      };

      const mockEntries = [{
        id: 1,
        leadId: 1,
        Lead: { id: 1, email: 'winner@example.com', name: 'Winner' }
      }];

      Drawing.findByPk = jest.fn().mockResolvedValue(mockDrawing);
      DrawingEntry.findAll.mockResolvedValue(mockEntries);
      emailService.sendDrawingWinnerNotification = jest.fn()
        .mockRejectedValue(new Error('Email failed'));

      const result = await drawingService.selectWinner(1);

      // Should still complete successfully even if email fails
      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send winner notification:',
        expect.any(Error)
      );
    });
  });

  describe('getDrawingStats', () => {
    test('should return statistics for a drawing', async () => {
      const mockDrawing = {
        id: 1,
        name: 'January 2024 Drawing',
        status: 'active',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        winnerId: null,
        createdAt: new Date('2024-01-01')
      };

      const mockEntries = [
        { id: 1, leadId: 1, entryDate: new Date('2024-01-05') },
        { id: 2, leadId: 2, entryDate: new Date('2024-01-10') },
        { id: 3, leadId: 3, entryDate: new Date('2024-01-15') }
      ];

      Drawing.findByPk = jest.fn().mockResolvedValue(mockDrawing);
      DrawingEntry.findAll.mockResolvedValue(mockEntries);

      const result = await drawingService.getDrawingStats(1);

      expect(result).toEqual({
        drawing: mockDrawing,
        totalEntries: 3,
        uniqueEntrants: 3,
        entriesByDate: expect.any(Object),
        status: 'active',
        daysRemaining: expect.any(Number)
      });
    });

    test('should include winner info for completed drawings', async () => {
      const mockWinner = {
        id: 1,
        email: 'winner@example.com',
        name: 'Winner Name'
      };

      const mockDrawing = {
        id: 1,
        status: 'completed',
        winnerId: 1,
        completedAt: new Date('2024-01-31'),
        getWinner: jest.fn().mockResolvedValue(mockWinner)
      };

      Drawing.findByPk = jest.fn().mockResolvedValue(mockDrawing);
      DrawingEntry.findAll.mockResolvedValue([]);

      const result = await drawingService.getDrawingStats(1);

      expect(result.winner).toEqual({
        id: 1,
        email: 'winner@example.com',
        name: 'Winner Name'
      });
    });
  });

  describe('getEligibleLeads', () => {
    test('should return leads eligible for drawing', async () => {
      const mockLeads = [
        {
          id: 1,
          email: 'eligible1@example.com',
          isQualified: true,
          createdAt: new Date('2024-01-05')
        },
        {
          id: 2,
          email: 'eligible2@example.com',
          isQualified: true,
          createdAt: new Date('2024-01-10')
        }
      ];

      Lead.findAll.mockResolvedValue(mockLeads);

      const result = await drawingService.getEligibleLeads();

      expect(Lead.findAll).toHaveBeenCalledWith({
        where: {
          isQualified: true,
          createdAt: {
            [expect.any(Symbol)]: expect.any(Date) // Op.gte
          }
        }
      });
      expect(result).toEqual(mockLeads);
    });

    test('should filter by date range if provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      Lead.findAll.mockResolvedValue([]);

      await drawingService.getEligibleLeads(startDate, endDate);

      expect(Lead.findAll).toHaveBeenCalledWith({
        where: {
          isQualified: true,
          createdAt: {
            [expect.any(Symbol)]: [startDate, endDate] // Op.between
          }
        }
      });
    });
  });

  describe('autoEnterEligibleLeads', () => {
    test('should automatically enter all eligible leads into drawing', async () => {
      const mockDrawing = { id: 1, status: 'active' };
      const mockLeads = [
        { id: 1, email: 'lead1@example.com' },
        { id: 2, email: 'lead2@example.com' },
        { id: 3, email: 'lead3@example.com' }
      ];

      Drawing.findOne.mockResolvedValue(mockDrawing);
      Lead.findAll.mockResolvedValue(mockLeads);
      DrawingEntry.findOne = jest.fn().mockResolvedValue(null);
      DrawingEntry.create.mockResolvedValue({});

      const result = await drawingService.autoEnterEligibleLeads();

      expect(DrawingEntry.create).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        entriesAdded: 3,
        totalEligible: 3
      });
    });

    test('should skip already entered leads', async () => {
      const mockDrawing = { id: 1, status: 'active' };
      const mockLeads = [
        { id: 1, email: 'lead1@example.com' },
        { id: 2, email: 'lead2@example.com' }
      ];

      Drawing.findOne.mockResolvedValue(mockDrawing);
      Lead.findAll.mockResolvedValue(mockLeads);
      
      // First lead already entered, second not
      DrawingEntry.findOne = jest.fn()
        .mockResolvedValueOnce({ id: 1 }) // Already entered
        .mockResolvedValueOnce(null);     // Not entered
        
      DrawingEntry.create.mockResolvedValue({});

      const result = await drawingService.autoEnterEligibleLeads();

      expect(DrawingEntry.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        entriesAdded: 1,
        totalEligible: 2
      });
    });
  });
});