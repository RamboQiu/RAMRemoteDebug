import express from 'express';
import ip from 'ip'
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i
    });
  }

  setupPrimary();
} else {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter()
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  app.get('/index.css', (req, res) => {
    res.sendFile(join(__dirname, 'index.css'));
  });

  app.get('/send', (req, res) => {
    let query = req.query
    console.log("---------获取到指令入参")
    console.log(req.query)
    let event = query["event"]
    let msg = query["msg"]
    io.timeout(30000).emit(event, msg, (_, data) => {
      console.log('响应指令:', data);
      res.send(data[0])
    });
  });

  io.on('connection', async (socket) => {
    socket.onAny(async (event, msg, clientOffset, callback) => {
      console.log('---------服务器收到消息')
      console.log(event)
      console.log(msg)
      console.log(clientOffset)
      console.log(callback)
      console.log('---------')
      io.emit(event, msg, "服务端广播消息");
      if (callback != undefined) {
        callback();
      }
    });
  });

  const port = process.env.PORT;

  server.listen(port, () => {
    var myip = ip.address()
    console.log(`可使用的通信端口 http://${myip}:${port}`);
  });
}
