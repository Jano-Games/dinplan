#!/usr/bin/env node
/**
 * DinPlan Notification Queue Worker
 * Uses Redis + BullMQ for exact-time notification delivery
 * Run with PM2 for auto-restart
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { Queue, Worker } = require('bullmq');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const IORedis = require('ioredis');

// ---- Config ----
const redis = new IORedis({ maxRetriesPerRequest: null });
const QUEUE_NAME = 'dinplan-reminders';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const queue = new Queue(QUEUE_NAME, { connection: redis });

// ---- Send push notification ----
async function sendPush(userId, title, body, reminderId) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) {
    console.log(`  ⚠ No subscriptions for user ${userId.slice(0, 8)}...`);
    return;
  }

  const payload = JSON.stringify({
    title,
    body: body || 'Time!',
    tag: `dinplan-${reminderId}`,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload);
      console.log(`  ✓ Sent to ${userId.slice(0, 8)}... — "${title}"`);
    } catch (err) {
      console.error(`  ✗ Push failed: ${err.message}`);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        console.log(`  ✗ Removed stale subscription`);
      }
    }
  }
}

// ---- Worker: processes jobs at exact time ----
const worker = new Worker(QUEUE_NAME, async (job) => {
  const { reminderId, userId, title, body } = job.data;
  console.log(`[${new Date().toISOString()}] 🔔 Firing: "${title}" (reminder #${reminderId})`);

  // Send push
  await sendPush(userId, title, body, reminderId);

  // Mark as fired in DB
  await supabase
    .from('reminders')
    .update({ is_fired: true })
    .eq('id', reminderId);

}, {
  connection: redis,
  concurrency: 5,
});

worker.on('completed', (job) => {
  console.log(`  ✓ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`  ✗ Job ${job?.id} failed: ${err.message}`);
});

// ---- Schedule existing unfired reminders on startup ----
async function scheduleExisting() {
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_fired', false)
    .eq('is_dismissed', false);

  if (error) {
    console.error('Error loading reminders:', error.message);
    return;
  }

  // Clear old jobs
  const existing = await queue.getDelayed();
  for (const job of existing) {
    await job.remove();
  }

  let scheduled = 0;
  for (const r of reminders || []) {
    const delay = new Date(r.remind_at).getTime() - Date.now();
    if (delay <= 0) {
      // Already due — fire immediately
      await queue.add('reminder', {
        reminderId: r.id,
        userId: r.user_id,
        title: r.title,
        body: r.body,
      });
    } else {
      await queue.add('reminder', {
        reminderId: r.id,
        userId: r.user_id,
        title: r.title,
        body: r.body,
      }, { delay, jobId: `reminder-${r.id}` });
    }
    scheduled++;
  }

  console.log(`[${new Date().toISOString()}] Scheduled ${scheduled} reminder(s)`);
}

// ---- Listen for new reminders via Supabase Realtime ----
function listenForChanges() {
  const channel = supabase
    .channel('reminders-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'reminders',
    }, async (payload) => {
      const r = payload.new;
      const delay = new Date(r.remind_at).getTime() - Date.now();
      console.log(`[${new Date().toISOString()}] 📥 New reminder: "${r.title}" (delay: ${Math.round(delay / 1000)}s)`);

      await queue.add('reminder', {
        reminderId: r.id,
        userId: r.user_id,
        title: r.title,
        body: r.body,
      }, {
        delay: Math.max(delay, 0),
        jobId: `reminder-${r.id}`,
      });
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'reminders',
    }, async (payload) => {
      const r = payload.new;

      // If dismissed or snoozed, reschedule
      if (r.is_dismissed) {
        // Remove job
        const jobs = await queue.getDelayed();
        const job = jobs.find(j => j.data.reminderId === r.id);
        if (job) await job.remove();
        console.log(`[${new Date().toISOString()}] ❌ Dismissed: "${r.title}"`);
        return;
      }

      // Snoozed — reschedule
      if (r.snooze_until && !r.is_fired) {
        const delay = new Date(r.remind_at).getTime() - Date.now();
        console.log(`[${new Date().toISOString()}] 😴 Snoozed: "${r.title}" (delay: ${Math.round(delay / 1000)}s)`);

        // Remove old job
        const jobs = await queue.getDelayed();
        const oldJob = jobs.find(j => j.data.reminderId === r.id);
        if (oldJob) await oldJob.remove();

        await queue.add('reminder', {
          reminderId: r.id,
          userId: r.user_id,
          title: r.title,
          body: r.body,
        }, {
          delay: Math.max(delay, 0),
          jobId: `reminder-${r.id}-snoozed-${Date.now()}`,
        });
      }
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'reminders',
    }, async (payload) => {
      const r = payload.old;
      const jobs = await queue.getDelayed();
      const job = jobs.find(j => j.data.reminderId === r.id);
      if (job) await job.remove();
      console.log(`[${new Date().toISOString()}] 🗑 Deleted reminder #${r.id}`);
    })
    .subscribe();

  console.log('[Realtime] Listening for reminder changes...');
}

// ---- Start ----
async function start() {
  console.log('═══════════════════════════════════════');
  console.log('  DinPlan Notification Worker Started');
  console.log('  Redis + BullMQ + Web Push');
  console.log('═══════════════════════════════════════');

  await scheduleExisting();
  listenForChanges();

  console.log('Worker ready. Waiting for reminders...\n');
}

start().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await worker.close();
  await redis.quit();
  process.exit(0);
});
