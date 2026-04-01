import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = 'BH5IcY4oHer1BaZNirvSivFkmlFFypDGUQuUgbo_lvuoe-tY2z79ILR2-G69qj2kXlE4uhZiOZRRgyPCobPJ5QE';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push not supported');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    // Save to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint!;
    const p256dh = subJson.keys!.p256dh!;
    const auth = subJson.keys!.auth!;

    // Upsert subscription
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .single();

    if (!existing) {
      await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
      });
    }

    console.log('Push subscription saved!');
    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}
