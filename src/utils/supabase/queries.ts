import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

export const getUser = cache(async (supabase: SupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .order('created', { ascending: false }) // select the last subscription
    .limit(1);

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
});

export const getProducts = cache(async (supabase: SupabaseClient) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

export const getUserDetails = cache(async (supabase: SupabaseClient) => {
  const { data: userDetails } = await supabase
    .from('users')
    .select('*')
    .single();
  return userDetails;
});

export const getUserPodcasts = cache(async (supabase: SupabaseClient) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data: podcasts, error } = await supabase
    .from('user_podcasts')
    .select('id, audio_url, subtitles_url, created_at, title, slug')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user podcasts:', error);
    return [];
  }

  return podcasts;
});
