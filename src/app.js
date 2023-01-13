import express from "express"
import cors from "cors"
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import dayjs from 'dayjs'

dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;

try {
  await mongoClient.connect()
  db = mongoClient.db()
  console.log("Conectou ao banco")
} catch (error) {
  console.log('Deu errro no server')
}

const server = express()


server.use(express.json())
server.use(cors())

server.post("/participants", async (req, res) => {
    const user = req.body
  
    try {
  
      const userExists = await db.collection("participants").findOne({ name: user.name })
  
      if (userExists) return res.status(409).send("Esse usuário já existe")
  
      await db.collection("participants").insertOne({name: user.name, lastStatus: Date.now()})
      await db.collection("messages").insertOne(
      {from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')})
  
      res.sendStatus(201)
  
    } catch (err) {
      console.log(err)
      res.status(500).send("Deu algo errado no servidor")
    }
})

server.listen(5000, () => {
  console.log('Servidor funfou de boas!!!')
})