import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './db';
import { startMonitoringEngine, checkSingleMonitor } from './monitorService';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/monitors', async (_req: Request, res: Response) => {
  try {
    const monitors = await prisma.monitor.findMany({
      include: {
        checkLogs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = monitors.map((m) => {
      const totalChecks = m.checkLogs.length;
      const successfulChecks = m.checkLogs.filter((log) => log.isUp).length;
      const uptimePercentage =
        totalChecks > 0
          ? ((successfulChecks / totalChecks) * 100).toFixed(2)
          : '100.00';

      const { checkLogs, ...monitorData } = m;
      return {
        ...monitorData,
        uptime_percentage: uptimePercentage,
        last_latency_ms: m.lastLatencyMs,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
});

app.post('/api/monitors', async (req: Request, res: Response) => {
  const { name, url, interval_seconds } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  try {
    const newMonitor = await prisma.monitor.create({
      data: {
        name,
        url,
        intervalSeconds: interval_seconds ? Number(interval_seconds) : 30,
      },
    });

    await checkSingleMonitor(newMonitor);
    res.status(201).json(newMonitor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create monitor' });
  }
});

app.delete('/api/monitors/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.monitor.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete monitor' });
  }
});

app.get('/api/monitors/:id/logs', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const logs = await prisma.checkLog.findMany({
      where: { monitorId: Number(id) },
      orderBy: { checkedAt: 'desc' },
      take: 20,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

async function bootstrap() {
  startMonitoringEngine();
  app.listen(PORT, () => {
    console.log(`[Server] PulseBoard Backend (Prisma) listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Startup failed:', err);
  process.exit(1);
});
