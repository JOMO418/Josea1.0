const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all branches
router.get('/', authenticate, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: [
        { isHeadquarters: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        location: true,
        isActive: true,
        isHeadquarters: true,
      }
    });

    res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

module.exports = router;
