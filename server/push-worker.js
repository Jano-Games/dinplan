#!/usr/bin/env node
/**
 * DinPlan Push Notification Worker
 * Runs every minute via cron/PM2
 * Checks for due reminders and sends web push notifications
 */

require('dotenv').config({ path: __dirname + '/.env' });
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function checkAndSend() {
  const now = new Date().toISOString();

  // Get unfired reminders that are due
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_fired', false)
    .eq('is_dismissed', false)
    .lte('remind_at', now);

  if (error) {
    console.error('Error fetching reminders:', error.message);
    return;
  }

  if (!reminders || reminders.length === 0) {
    return; // Nothing due
  }

  console.log(`[${new Date().toISOString()}] ${reminders.length} reminder(s) due`);

  for (const reminder of reminders) {
    // Get user's push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', reminder.user_id);

    if (subs && subs.length > 0) {
      const payload = JSON.stringify({
        title: reminder.title,
        body: reminder.body || 'Time!',
        tag: `dinplan-${reminder.id}`,
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, payload);
          console.log(`  ✓ Sent to user ${reminder.user_id.slice(0, 8)}... — "${reminder.title}"`);
        } catch (err) {
          console.error(`  ✗ Failed:`, err.message);
          // Remove invalid subscription (410 Gone)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`  ✗ Removed stale subscription`);
          }
        }
      }
    }

    // Mark as fired
    await supabase
      .from('reminders')
      .update({ is_fired: true })
      .eq('id', reminder.id);
  }
}

checkAndSend()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Worker error:', err);
    process.exit(1);
  });
