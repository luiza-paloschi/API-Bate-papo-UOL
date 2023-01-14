import express from "express"
import cors from "cors"
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import joi from 'joi'

dotenv.config()
// db.participants.deleteMany({})

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

setInterval(async () => {
    try {
        const participants = await db.collection("participants").find({}).toArray()
        const inactives = participants.filter((participant) => Date.now() - participant.lastStatus > 10000)
        inactives.forEach(async element => {
            await db.collection("participants").deleteOne({ name : element.name })
            await db.collection("messages").insertOne(
                {from: element.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss')})
        });
        
    } catch (error) {
        console.log(error)
        res.status(500).send("Deu algo errado no servidor")
    }
},15000)


server.post("/participants", async (req, res) => {
    const user = req.body
    
    const userSchema = joi.object({
      name: joi.string().required()
    });
    const validation = userSchema.validate(user, { abortEarly: false })
    if (validation.error) {
      const errors = validation.error.details.map((detail) => detail.message);
      return res.status(422).send(errors);
    }

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
        const participants = await db.collection("participants").find({}).toArray()
        return res.send(participants)
    } catch (error) {
        console.log(error)
        res.status(500).send("Deu algo errado no servidor")
    }
})

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const {user} = req.headers
    
    const messageSchema = joi.object({
      to: joi.string().required(),
      text: joi.string().required(),
      type: joi.string().valid('message','private_message').required()
    });
    const validation = messageSchema.validate({ to, text, type }, { abortEarly: false })
    if (validation.error) {
      const errors = validation.error.details.map((detail) => detail.message);
      return res.status(422).send(errors);
    }

    try {
  
      const userExists = await db.collection("participants").findOne({ name: user })
  
      if (!userExists) return res.status(422).send("Esse usuário não se encontra na lista de participantes")
  
      await db.collection("messages").insertOne(
      {from: user, to, text, type, time: dayjs().format('HH:mm:ss')})
  
      res.sendStatus(201)
  
    } catch (err) {
      console.log(err)
      res.status(500).send("Deu algo errado no servidor")
    } 
})

server.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const {user} = req.headers
    if (limit){
      if (isNaN(limit) || (!isNaN(limit) && limit <= 0)){
        return res.sendStatus(422)
      }
    }

    try {
        const messages = await db.collection("messages").find().toArray()
        const filtered = messages.filter((message) => message.type === "message" || message.type === "status" ||
        (message.type === "private_message" && (message.from === user || message.to === user)))
        if (!limit) return res.send([...filtered].reverse())
        return res.send([...filtered].slice(-limit).reverse())
    } catch (error) {
        console.log(error)
        res.status(500).send("Deu algo errado no servidor")
    }
})

server.post("/status", async (req, res) => {
    const {user} = req.headers
    
    try {
  
      const userExists = await db.collection("participants").findOne({ name: user })
  
      if (!userExists) return res.sendStatus(404)
  
      await db.collection("participants").updateOne({ name: user }, 
        {
            $set: {
                lastStatus: Date.now()
            }
        })
       
      res.sendStatus(200)
  
    } catch (err) {
      console.log(err)
      res.status(500).send("Deu algo errado no servidor")
    } 
})

server.listen(5000, () => {
  console.log('Servidor funfou de boas!!!')
})