import { env } from '$env/dynamic/public';

export const inferencePaused = env.PUBLIC_INFERENCE_PAUSED === 'true';
export const inferencePausedMessage =
	'Inference features on this demonstration instance are currently paused.';
