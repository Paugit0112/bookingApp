const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'evalbook',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
})

module.exports = pool
