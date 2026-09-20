import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
process.env.HOST ||= '127.0.0.1';
process.env.PORT ||= '34342';
if (!process.env.HOST_HEADER) {
	process.env.ORIGIN ||= `http://${process.env.HOST}:${process.env.PORT}`;
}
process.env.SHUTDOWN_TIMEOUT ||= '5';
process.on('sveltekit:shutdown', () => process.exit(0));
await import(pathToFileURL(resolve(process.env.APP_BUILD_DIR || 'build', 'index.js')).href);
