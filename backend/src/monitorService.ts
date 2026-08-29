import { prisma } from './db';
import { Monitor } from '@prisma/client';

export async function checkSingleMonitor(monitor: Monitor): Promise<void> {
  const startTime = Date.now();
  let isUp = false;
  let statusCode = 0;
  let latencyMs = 0;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(monitor.url, { signal: controller.signal });
    clearTimeout(timeoutId);

    latencyMs = Date.now() - startTime;
    statusCode = response.status;
    isUp = response.ok;
  } catch (err) {
    latencyMs = Date.now() - startTime;
    isUp = false;
    statusCode = 0;
  }

  const newStatus = isUp ? 'UP' : 'DOWN';

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: newStatus,
      lastCheck: new Date(),
      lastLatencyMs: latencyMs,
    },
  });

  await prisma.checkLog.create({
    data: {
      monitorId: monitor.id,
      statusCode,
      latencyMs,
      isUp,
    },
  });
}

export function startMonitoringEngine(): void {
  setInterval(async () => {
    try {
      const monitors = await prisma.monitor.findMany();
      for (const monitor of monitors) {
        await checkSingleMonitor(monitor);
      }
    } catch (error) {
      console.error('[Monitor Engine] Error executing monitor sweep:', error);
    }
  }, 15000);
}
