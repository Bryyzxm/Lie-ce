'use client';

import {useEffect, useState} from 'react';

import {getSupabase, isSupabaseConfigured} from '../lib/supabase';

export interface AuthState {
 /** null = belum login; undefined selama pemeriksaan awal ditandai `checking`. */
 userId: string | null;
 email: string | null;
 checking: boolean;
}

/** Melacak sesi Supabase yang tersimpan di browser dan mengikuti perubahannya. */
export function useAuthSession(): AuthState {
 const [state, setState] = useState<AuthState>({userId: null, email: null, checking: isSupabaseConfigured});

 useEffect(() => {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabase();
  let active = true;

  void supabase.auth.getSession().then(({data}) => {
   if (!active) return;
   setState({userId: data.session?.user.id ?? null, email: data.session?.user.email ?? null, checking: false});
  });

  const {data: subscription} = supabase.auth.onAuthStateChange((_event, session) => {
   setState({userId: session?.user.id ?? null, email: session?.user.email ?? null, checking: false});
  });

  return () => {
   active = false;
   subscription.subscription.unsubscribe();
  };
 }, []);

 return state;
}
