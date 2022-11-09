import cors from "cors"
import express from "express"

const app = express();
app.use(cors());
app.use(express.json());

const participantes = [
    {name: 'João', lastStatus: 12313123}
];

const mensagem = [
    {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'}
];

app.get("/participants", (req, res) =>{
    res.send(participantes);
});

app.listen(5000);