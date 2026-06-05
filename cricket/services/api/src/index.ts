import Fastify from 'fastify'
import { whatsappRoutes } from './routes/whatsapp'

const server = Fastify({ logger: true })

server.register(whatsappRoutes, { prefix: '/webhook' })

const port = Number(process.env.API_PORT ?? 3001)

server.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
})
