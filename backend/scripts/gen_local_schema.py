# -*- coding: utf-8 -*-
"""
Generate backend/db/init/01_schema.sql: pozhi_schema.sql converted to run on a
plain PostgreSQL server (no Supabase auth schema, no Supabase roles, no RLS).
"""
import io, os, re

# Paths resolve against the repo root, so this runs from anywhere.
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'backend', 'pozhi_schema.sql')
DST = os.path.join(ROOT, 'backend', 'db', 'init', '01_schema.sql')
BANNER = '-- ==========================================\n'

raw = io.open(SRC, 'rb').read()
s = raw.decode('utf-8').replace('\r\n', '\n')


def banner_start_before(marker):
    i = s.index(marker)
    return s.rindex(BANNER, 0, i)


# Drop section 9 (RLS) and section 11 (Supabase role grants); keep the rest.
a_end = banner_start_before('-- 9. ROW LEVEL SECURITY')
b_start = banner_start_before('-- 10. SEED DATA')
c_start = banner_start_before('-- 11. PERMISSIONS')
out = s[:a_end] + s[b_start:c_start]


def rep(old, new):
    """Replace `old`, tolerating trailing whitespace at the end of each line."""
    global out
    pattern = re.compile(re.escape(old).replace('\\\n', '[ \\t]*\\n'))
    found = pattern.findall(out)
    assert len(found) == 1, 'NOT FOUND/AMBIGUOUS (%d): %r' % (len(found), old[:70])
    out = pattern.sub(lambda _: new, out, count=1)


# ---- header ----
rep('''-- ==========================================
-- POZHI PHOTOGRAPHY STUDIO - DATABASE SCHEMA
-- Architecture: Service-Specific with Smart Storage
-- Date: February 11, 2026 (Updated)
-- ==========================================''',
'''-- ==========================================
-- POZHI PHOTOGRAPHY STUDIO - DATABASE SCHEMA (PLAIN POSTGRESQL)
--
-- GENERATED FILE - do not edit by hand.
-- Source: backend/pozhi_schema.sql, converted for a self-hosted PostgreSQL
-- server. Differences from the Supabase version:
--   * profiles is the identity table; its id no longer references auth.users,
--     and it carries password_hash / google_sub itself.
--   * Row Level Security and all policies are dropped. They relied on
--     auth.uid(), which does not exist outside Supabase, and are redundant
--     now that the Express backend is the only database client.
--   * Grants to the anon / authenticated / service_role roles are dropped.
--   * Adds the session and token tables Supabase Auth used to provide.
--
-- The Postgres Docker image runs every .sql in this directory, in filename
-- order, the first time the data volume is created.
-- ==========================================''')

# ---- schema grants: Supabase roles do not exist locally ----
rep('''GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;''',
'''GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO public;''')

# ---- profiles becomes the identity table ----
rep('''CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text DEFAULT 'customer' NOT NULL, -- Added to support RBAC (admin/customer)
  avatar_url text, -- Added for consistency with implementation details
''',
'''CREATE TABLE public.profiles (
  -- Identity lives here now. Supabase's auth.users is gone, so this table owns
  -- the credential columns as well as the profile ones.
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text DEFAULT 'customer' NOT NULL, -- Added to support RBAC (admin/customer)
  avatar_url text, -- Added for consistency with implementation details

  -- Credentials (replaces auth.users)
  -- password_hash is NULL for accounts that only ever signed in with Google
  -- or a passkey; at least one sign-in method must exist for a usable account.
  password_hash text,
  google_sub text UNIQUE,             -- Google OAuth "sub" claim
''')

# ---- orders: columns the application code writes but the schema never had ----
rep('''  -- Status
  order_status text NOT NULL DEFAULT 'pending',

  -- Metadata
  ip_address inet,''',
'''  -- Status
  order_status text NOT NULL DEFAULT 'pending',

  -- Fulfilment (accepted by updateOrderStatusSchema)
  tracking_number text,
  courier_service text,
  internal_notes text,
  cancellation_reason text,

  -- Customer feedback (written by submitFeedback)
  feedback_rating integer CHECK (feedback_rating IS NULL OR feedback_rating BETWEEN 1 AND 5),
  feedback_comment text,

  -- Metadata
  ip_address inet,''')

# ---- append the auth tables Supabase used to provide ----
AUTH_TABLES = '''
-- ==========================================
-- 9. SESSIONS & AUTH TOKENS
-- Replaces what Supabase Auth managed for us. The backend issues a short-lived
-- access JWT plus one row here per long-lived refresh token, so a session can
-- be revoked server-side (log out, ban, password change).
-- ==========================================

CREATE TABLE public.refresh_tokens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Only ever store a hash: a leaked table must not yield usable sessions.
  token_hash text UNIQUE NOT NULL,

  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,

  -- Context, for showing the customer their active sessions
  user_agent text,
  ip_address text,

  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used_at timestamp with time zone
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Single-use tokens for email verification and password reset. Same rule:
-- hashed at rest, single use, short expiry.
CREATE TABLE public.auth_tokens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  purpose text NOT NULL,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT valid_purpose CHECK (purpose IN ('email_verification', 'password_reset'))
);

CREATE INDEX idx_auth_tokens_user_purpose ON auth_tokens(user_id, purpose);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- WebAuthn registration/authentication challenges. Supabase was not holding
-- these for us, but they currently live in memory, which breaks across restarts
-- and across more than one backend process.
CREATE TABLE public.webauthn_challenges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  challenge text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT valid_webauthn_purpose CHECK (purpose IN ('registration', 'authentication'))
);

CREATE INDEX idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

CREATE TRIGGER trg_profiles_updated_at_local BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
'''

# The source already creates trg_profiles_updated_at, so drop the duplicate.
AUTH_TABLES = AUTH_TABLES.replace('''
CREATE TRIGGER trg_profiles_updated_at_local BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
''', '')

out = out.rstrip('\n') + '\n' + AUTH_TABLES

# ---- sanity: nothing Supabase-specific left ----
# Comments are allowed to mention Supabase; executable SQL is not.
code_only = '\n'.join(
    l.split('--')[0] for l in out.split('\n') if not l.lstrip().startswith('--')
)
for forbidden in ['auth.users', 'auth.uid()', 'TO anon', 'TO authenticated',
                  'TO service_role', 'ROW LEVEL SECURITY', 'CREATE POLICY']:
    assert forbidden not in code_only, 'Supabase-specific SQL survived: ' + forbidden

os.makedirs(os.path.dirname(DST), exist_ok=True)
io.open(DST, 'w', encoding='utf-8', newline='\n').write(out)
print('wrote %s (%d lines)' % (DST, out.count('\n') + 1))
