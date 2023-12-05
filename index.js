const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()

let conn = mysql.createConnection({
    user: "root",
    host: "localhost",
    password: "",
})
conn.connect((err) => {
    if (err) {
        console.log(err.message)
    } else {
        console.log('database connected')
        conn.query('CREATE DATABASE IF NOT EXISTS students',
            (err, result) => {
                if (err) {
                    console.log(err.message)
                } else {
                    console.log('database created')
                }
            })
        conn.query('USE students',
            (err, result) => {
                if (err) return console.log(err.message)
                console.log('database switched successfully')
            })
        console.log('sql connected succcessfully')
    }
})
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


const auth = async (req, res, next) => {
    try {
        const { authorization } = req.headers
        if (!authorization) return res.status(401).json('You are not autherised')
        let token = authorization.split(" ")[1]
        let { email } = await jwt.verify(token, 'vinodvadla7144')
        if (!email) return res.status(401).json('NOt autherized')
        let sql = 'SELECT id,name FROM users WHERE email=?'

        conn.query(sql, [email], (err, result) => {
            if (err) {
                return res.status(500).json('Internal error')
            }
            let { name } = result[0]
            req.user = name
            next()
        })
    } catch (error) {
        return res.status(500).json('Internal server error')
    }
}

app.post('/register', async (req, res) => {
    let { name, email, password } = req.body
    if (!name || !email || !password) return res.status(404).json('Please fill all the fields')
    conn.query(
        'CREATE TABLE IF NOT EXISTS users(id INT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(20),email VARCHAR(50) UNIQUE,password VARCHAR(100))',
        (err, result) => {
            if (err) {
                return console.log(err.message)
            }
            console.log(result)
        })
    let hash = await bcrypt.hash(password, 10)
    conn.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [name, email, hash],
        (err, result) => {
            if (err) {
                console.log(err.message)
            } else {
                res.status(200).json('user registered successfully')
            }
        })
})


app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body
        if (!email || !password) return res.status(404).json('Please fill all the values')
        let sql = `SELECT * FROM users WHERE email=?`

        conn.query(sql, [email], async (err, result) => {
            if (err) {
                throw new Error(err.message)
            }

            if (result.length < 1) return res.status(404).json('User not exists')
            let user = result[0]
            let com = await bcrypt.compare(password, user.password)
            if (!com) return res.status(404).json('Incorrect password')
            let email = user.email
            let token = await jwt.sign({ email }, "vinodvadla7144")
            return res.status(200).json({
                message: "user logged in successfully",
                token
            })
        })
    } catch (err) {
        res.status(500).json('Internal server error')
    }
})

app.get('/home', auth, (req, res) => {
    res.status(200).json(`welcome to home ${req.user}`)
})



app.listen(4000, () => {
    console.log('server running on 4000')
})

module.exports = conn
