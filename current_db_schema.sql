-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.devices (
  device_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (device_id),
  CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.friendships (
  user_id uuid NOT NULL,
  friend_user_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT friendships_pkey PRIMARY KEY (user_id, friend_user_id),
  CONSTRAINT friendships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT friendships_friend_user_id_fkey FOREIGN KEY (friend_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.organization_members (
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  invited_by uuid,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'pending'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (org_id, user_id),
  CONSTRAINT organization_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  visibility text NOT NULL DEFAULT 'private'::text,
  default_org_id uuid,
  device_linked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.saved_passages (
  user_id uuid NOT NULL,
  verse_id text NOT NULL,
  start smallint NOT NULL,
  end smallint NOT NULL,
  saved_at timestamp with time zone NOT NULL DEFAULT now(),
  source text DEFAULT 'built-in'::text CHECK (source = ANY (ARRAY['built-in'::text, 'custom'::text])),
  translation text,
  reference text,
  custom_text text,
  CONSTRAINT saved_passages_pkey PRIMARY KEY (user_id, verse_id),
  CONSTRAINT saved_passages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.verse_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id uuid,
  verse_id text NOT NULL,
  mode text NOT NULL CHECK (mode = ANY (ARRAY['type'::text, 'speech'::text, 'stealth'::text, 'sequence'::text])),
  accuracy numeric NOT NULL,
  input_length integer NOT NULL,
  missed_count integer NOT NULL DEFAULT 0,
  extra_count integer NOT NULL DEFAULT 0,
  speech_duration numeric,
  confidence_score numeric,
  stealth_stats jsonb,
  sequence_stats jsonb,
  source text DEFAULT 'built-in'::text CHECK (source = ANY (ARRAY['built-in'::text, 'custom'::text])),
  translation text,
  reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  diff jsonb,
  verse_text text,
  transcription text,
  CONSTRAINT verse_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT verse_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT verse_attempts_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id)
);
CREATE TABLE public.verse_progress (
  user_id uuid NOT NULL,
  verse_id text NOT NULL,
  best_accuracy numeric,
  perfect_counts jsonb,
  last_attempt_at timestamp with time zone,
  total_attempts integer NOT NULL DEFAULT 0,
  last_device_id uuid,
  source text DEFAULT 'built-in'::text CHECK (source = ANY (ARRAY['built-in'::text, 'custom'::text])),
  translation text,
  reference text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT verse_progress_pkey PRIMARY KEY (user_id, verse_id),
  CONSTRAINT verse_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT verse_progress_last_device_id_fkey FOREIGN KEY (last_device_id) REFERENCES public.devices(device_id)
);