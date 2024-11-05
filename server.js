const express = require('express');
const authRoutes = require('./routes/authRoutes');
const liquidatorRoutes = require('./routes/liquidatorRoutes');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 

app.use('/api/auth', authRoutes);
app.use('/api/liquidator', liquidatorRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
