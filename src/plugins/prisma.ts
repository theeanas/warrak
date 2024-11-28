import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

declare module 'fastify' {
	interface FastifyInstance {
		prisma: PrismaClient;
	}
}

export default fp(async (server) => {
	const prisma = new PrismaClient({
		// log: ['query'],
		datasourceUrl: process.env.DATABASE_URL
	});
	server.decorate('prisma', prisma);
	server.addHook('onClose', async (server) => {
		await server.prisma.$disconnect();
	});
});
