import cors from "cors";
import dayjs from "dayjs";
import express from "express";
import joi from "joi";
import { MongoClient } from "mongodb";


const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message")
});

const userSchema = joi.object({
    name: joi.string().required()
});

const minute = 1000 * 60;
let minutesPast = Math.round(Date.now() / minute);

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017");
try {
    await mongoClient.connect();
} catch (error) {
    console.log(error);
};

const db = mongoClient.db("batepapo");
const userCollection = db.collection("users");
const messageCollection = db.collection("messages");

const mensagem = [
    {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'}
];

app.get("/participants", async (req, res) =>{
    const participantes = await userCollection.find().toArray();
    res.send(participantes);
});

app.post("/participants", async (req, res) =>{
    const name = req.body;
    const now = dayjs().format("HH:mm:ss");

    const novaMensagem = {
        from: name.name,
        to: "Todos",
        text: "entra na sala",
        type: "status",
        time: now
    };

    const {error} = userSchema.validate(name, {abortEarly: false});
    if (error){
        const errors = error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    };
    const nomeExistente = await userCollection.findOne({name});
    if (nomeExistente){
        res.status(409).send("nome usuário já está sendo utilizado");
    };
    try {
        await userCollection.insertOne({...name, lastStatus: minutesPast});
        await messageCollection.insertOne(novaMensagem);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    };
});

app.post("/messages", async (req, res) =>{
    const name = req.headers.user;
    const {to, text, type} = req.body;
    const now = dayjs().format("HH:mm:ss");
    const novaMensagem = {
        from: name,
        to,
        text,
        type,
        time: now
    };
    const nomeExistente = await userCollection.findOne({name});
    if (!nomeExistente){
        res.status(409).send("usuário não encontrado");
        return;
    };
    try {
        await messageCollection.insertOne(novaMensagem);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    }
});

app.get("/messages", (req, res) =>{
    res.send(mensagem);
});

app.listen(5000);