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

server.get("/participants", async (_, res) => {
    try {
        const participants = await db.collection("participants").find().toArray()
        return res.send(participants)
    } catch (error) {
        console.log(error)
        res.status(500).send("Deu algo errado no servidor")
    }
})

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const {user} = req.headers

    try {
  
      const userExists = await db.collection("participants").findOne({ name: user })
  
      if (!userExists) return res.status(422).send("Esse usuário não se encontra na lista de participantes")
  
      await db.collection("participants").insertOne({name: user.name, lastStatus: Date.now()})
      await db.collection("messages").insertOne(
      {from: user, to, text, type, time: dayjs().format('HH:mm:ss')})
  
      res.sendStatus(201)
  
    } catch (err) {
      console.log(err)
      res.status(500).send("Deu algo errado no servidor")
    } 
})

server.listen(5000, () => {
  console.log('Servidor funfou de boas!!!')
})