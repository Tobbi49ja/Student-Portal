const express = require('express');
const path = require('path');
const studentsRouter = require('./students');
const studentsController = require('../controllers/studentsController');

const router = express.Router();

// Client Routes
router.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client', 'about', 'index.html'));
});
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client', 'Login', 'index.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client', 'SignUp', 'index.html'));
});

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client', 'home', 'index.html'));
});

router.get('/profile', studentsController.verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../../client', 'Profile', 'index.html'));
});

router.get('/admin', studentsController.verifyToken, studentsController.verifyAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../../client', 'Admin', 'index.html'));
});

// API Routes
router.use('/students', studentsRouter);

// Error Handling
router.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../../client', 'error', 'index.html'));
});

module.exports = router;