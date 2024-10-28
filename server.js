const express = require('express');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
