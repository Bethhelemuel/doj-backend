const mysql = require('mysql2');


const db = mysql.createConnection({
    host: "localhost",  //process.env.DB_HOST,
    user: "doj", //process.env.DB_USER,
    password: "Q@qamba@doj24", //process.env.DB_PASS,
    database: "doj" //process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

module.exports = db;
