const { Lead, Drawing, DrawingEntry } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class DrawingService {
  /**
   * Create a new monthly drawing
   */
  async createMonthlyDrawing() {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      // Calculate start and end dates for the month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      
      // Check if drawing already exists for this month
      const existingDrawing = await Drawing.findOne({
        where: {
          startDate: {
            [Op.gte]: startDate
          },
          endDate: {
            [Op.lte]: endDate
          },
          type: 'monthly'
        }
      });
      
      if (existingDrawing) {
        logger.info('Monthly drawing already exists:', existingDrawing.name);
        return existingDrawing;
      }
      
      // Create new drawing
      const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long' });
      const drawing = await Drawing.create({
        name: `${monthName} ${year} Drawing`,
        type: 'monthly',
        status: 'active',
        startDate,
        endDate,
        prizeDetails: {
          type: 'consultation',
          value: 250,
          duration: '60 minutes'
        }
      });
      
      logger.info('Created new monthly drawing:', drawing.name);
      return drawing;
      
    } catch (error) {
      logger.error('Error creating monthly drawing:', error);
      throw error;
    }
  }
  
  /**
   * Enter a lead into the current active drawing
   */
  async enterDrawing(email) {
    try {
      // Find the lead
      const lead = await Lead.findOne({ where: { email } });
      if (!lead) {
        return {
          success: false,
          message: 'Lead not found'
        };
      }
      
      // Find active drawing
      const activeDrawing = await Drawing.findOne({
        where: { status: 'active' },
        order: [['createdAt', 'DESC']]
      });
      
      if (!activeDrawing) {
        return {
          success: false,
          message: 'No active drawing available'
        };
      }
      
      // Check if already entered
      const existingEntry = await DrawingEntry.findOne({
        where: {
          leadId: lead.id,
          drawingId: activeDrawing.id
        }
      });
      
      if (existingEntry) {
        return {
          success: false,
          message: 'Already entered in current drawing'
        };
      }
      
      // Create entry
      const entry = await DrawingEntry.create({
        leadId: lead.id,
        drawingId: activeDrawing.id,
        entryDate: new Date()
      });
      
      logger.info(`Lead ${email} entered into drawing ${activeDrawing.name}`);
      
      return {
        success: true,
        entry,
        message: 'Successfully entered into drawing'
      };
      
    } catch (error) {
      logger.error('Error entering drawing:', error);
      throw error;
    }
  }
  
  /**
   * Select a winner for a drawing
   */
  async selectWinner(drawingId) {
    try {
      // Find drawing
      const drawing = await Drawing.findByPk(drawingId);
      if (!drawing) {
        return {
          success: false,
          message: 'Drawing not found'
        };
      }
      
      // Check if already completed
      if (drawing.status === 'completed') {
        return {
          success: false,
          message: 'Drawing already completed'
        };
      }
      
      // Get all entries with lead information
      const entries = await DrawingEntry.findAll({
        where: { drawingId },
        include: [{
          model: Lead,
          attributes: ['id', 'email', 'name', 'company']
        }]
      });
      
      if (entries.length === 0) {
        return {
          success: false,
          message: 'No entries found for this drawing'
        };
      }
      
      // Randomly select winner
      const randomIndex = Math.floor(Math.random() * entries.length);
      const winnerEntry = entries[randomIndex];
      const winner = winnerEntry.Lead;
      
      // Update drawing with winner
      await drawing.update({
        status: 'completed',
        winnerId: winner.id,
        completedAt: new Date()
      });
      
      // Send winner notification
      try {
        await emailService.sendDrawingWinnerNotification({
          email: winner.email,
          name: winner.name,
          prizeDetails: drawing.prizeDetails
        });
      } catch (emailError) {
        logger.error('Failed to send winner notification:', emailError);
        // Don't fail the entire operation if email fails
      }
      
      logger.info(`Winner selected for drawing ${drawing.name}: ${winner.email}`);
      
      return {
        success: true,
        winner: {
          id: winner.id,
          email: winner.email,
          name: winner.name
        },
        totalEntries: entries.length
      };
      
    } catch (error) {
      logger.error('Error selecting winner:', error);
      throw error;
    }
  }
  
  /**
   * Get statistics for a drawing
   */
  async getDrawingStats(drawingId) {
    try {
      const drawing = await Drawing.findByPk(drawingId);
      if (!drawing) {
        return null;
      }
      
      // Get all entries
      const entries = await DrawingEntry.findAll({
        where: { drawingId }
      });
      
      // Calculate stats
      const uniqueLeadIds = [...new Set(entries.map(e => e.leadId))];
      const entriesByDate = {};
      
      entries.forEach(entry => {
        const dateKey = entry.entryDate.toISOString().split('T')[0];
        entriesByDate[dateKey] = (entriesByDate[dateKey] || 0) + 1;
      });
      
      // Calculate days remaining
      const now = new Date();
      const endDate = new Date(drawing.endDate);
      const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      
      const stats = {
        drawing,
        totalEntries: entries.length,
        uniqueEntrants: uniqueLeadIds.length,
        entriesByDate,
        status: drawing.status,
        daysRemaining
      };
      
      // Include winner info if completed
      if (drawing.status === 'completed' && drawing.winnerId) {
        const winner = await drawing.getWinner();
        if (winner) {
          stats.winner = {
            id: winner.id,
            email: winner.email,
            name: winner.name
          };
        }
      }
      
      return stats;
      
    } catch (error) {
      logger.error('Error getting drawing stats:', error);
      throw error;
    }
  }
  
  /**
   * Get eligible leads for drawing
   */
  async getEligibleLeads(startDate = null, endDate = null) {
    try {
      const where = {
        isQualified: true
      };
      
      if (startDate && endDate) {
        where.createdAt = {
          [Op.between]: [startDate, endDate]
        };
      } else {
        // Default to leads from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        where.createdAt = {
          [Op.gte]: thirtyDaysAgo
        };
      }
      
      const leads = await Lead.findAll({ where });
      return leads;
      
    } catch (error) {
      logger.error('Error getting eligible leads:', error);
      throw error;
    }
  }
  
  /**
   * Automatically enter all eligible leads into the current drawing
   */
  async autoEnterEligibleLeads() {
    try {
      // Find active drawing
      const activeDrawing = await Drawing.findOne({
        where: { status: 'active' },
        order: [['createdAt', 'DESC']]
      });
      
      if (!activeDrawing) {
        return {
          success: false,
          message: 'No active drawing found'
        };
      }
      
      // Get eligible leads created within drawing period
      const eligibleLeads = await this.getEligibleLeads(
        activeDrawing.startDate,
        activeDrawing.endDate
      );
      
      let entriesAdded = 0;
      
      for (const lead of eligibleLeads) {
        // Check if already entered
        const existingEntry = await DrawingEntry.findOne({
          where: {
            leadId: lead.id,
            drawingId: activeDrawing.id
          }
        });
        
        if (!existingEntry) {
          await DrawingEntry.create({
            leadId: lead.id,
            drawingId: activeDrawing.id,
            entryDate: new Date()
          });
          entriesAdded++;
        }
      }
      
      logger.info(`Auto-entered ${entriesAdded} leads into drawing ${activeDrawing.name}`);
      
      return {
        success: true,
        entriesAdded,
        totalEligible: eligibleLeads.length
      };
      
    } catch (error) {
      logger.error('Error auto-entering eligible leads:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DrawingService();