import cors from "cors";
import dayjs from "dayjs";
import express from "express";
import joi from "joi";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const messageSchema = joi.object({
    from: joi.string().optional(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
    time: joi.string()
});

const userSchema = joi.object({
    name: joi.string().required()
});


dotenv.config()
const app = express();
app.use(cors());
app.use(express.json());

const mongoCilent = new MongoClient(process.env.MONGO_URI);
try {
    await mongoClient.connect();
} catch (error) {
    console.log(error);
};

const db = mongoClient.db("batepapo");
const userCollection = db.collection("users");
const messageCollection = db.collection("messages");

const mensagem = [
    { from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37' }
];

app.get("/participants", async (req, res) => {
    const participantes = await userCollection.find().toArray();
    res.send(participantes);
});

app.post("/participants", async (req, res) => {
    const name = req.body;
    const now = dayjs().format("HH:mm:ss");
    const lastStatus = Math.round(Date.now() / (10 * 360));
    const novaMensagem = {
        from: name.name,
        to: "Todos",
        text: "entra na sala",
        type: "status",
        time: now
    };

    const { error } = userSchema.validate(name, { abortEarly: false });
    if (error) {
        const errors = error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    };
    const nomeExistente = await userCollection.findOne({ name });
    if (nomeExistente) {
        res.status(409).send("nome usuário já está sendo utilizado");
    };
    try {
        await userCollection.insertOne({ ...name, lastStatus });
        await messageCollection.insertOne(novaMensagem);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    };
});

app.get("/messages", async (req, res) => {
    const limite = Number(req.query.limit);
    const user = req.headers.user;
    
    const mensagens = await messageCollection.find().toArray();
    const filtroRecipiente = mensagens.filter((r) => r.to === "Todos" || r.to === user || r.from === user);
    const filtroOrdem = [];
    filtroRecipiente.map((m) => {
        filtroOrdem.unshift(m)
    });
    if (limite) {
        filtroOrdem.length = limite
    }
    res.send(filtroOrdem);
});

app.post("/messages", async (req, res) => {
    const name = req.headers.user;
    const { to, text, type } = req.body;
    const now = dayjs().format("HH:mm:ss");
    const novaMensagem = {
        from: name,
        to,
        text,
        type,
        time: now
    };
    console.log(name);
    const { error } = messageSchema.validate(novaMensagem, { abortEarly: false });
    if (error) {
        const errors = error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    };
    const nomeExistente = await userCollection.findOne({ name });
    if (!nomeExistente) {
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

app.post("/status", async (req, res) => {
    const name = req.headers.user;
    const now = dayjs().format("HH:mm:ss");
    const lastStatus = Math.round(Date.now() / (10 * 360));
    const novaMensagem = {
        from: name,
        to: "Todos",
        text: "sai na sala",
        type: "status",
        time: now
    };
    try {
        const userFound = await userCollection.findOne({name});
        console.log(userFound);
        console.log(lastStatus);
        console.log(lastStatus-userFound.lastStatus)
        if (!userFound){
            return res.sendStatus(404);
        }
        if (lastStatus-userFound.lastStatus >= 15){
            await userCollection.deleteOne({name})
            await messageCollection.insertOne(novaMensagem);
        }
        await userCollection.updateOne({name}, {$set: {lastStatus}});
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(404);
    }
})

app.listen(5000);