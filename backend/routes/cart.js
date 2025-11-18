const express = require('express');
const router = express.Router();

// Example route
router.post('/add', (req, res) => {
    res.send('Add to cart route');
});

module.exports = router;